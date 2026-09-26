import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

void test('diagram gate rejects inventory, artifact and generator drift without mutation', async () => {
  const copy = await mkdtemp(join(tmpdir(), 'stellar-diagrams-'));
  try {
    const scripts = join(copy, 'scripts/docs');
    const diagrams = join(copy, 'docs/architecture/diagrams');
    await mkdir(scripts, { recursive: true });
    await mkdir(diagrams, { recursive: true });
    const checker = join(scripts, 'diagrams.ts');
    await cp(join(root, 'scripts/docs/diagrams.ts'), checker);
    await cp(join(root, 'scripts/support'), join(copy, 'scripts/support'), {
      recursive: true,
    });
    await cp(join(root, 'docs/architecture/diagrams'), diagrams, {
      recursive: true,
    });
    const manifest = await readFile(join(diagrams, 'manifest.json'));
    const source = await readFile(join(diagrams, 'first-report.json'));
    const check = () =>
      spawnSync(process.execPath, [checker, 'check'], { encoding: 'utf8' });
    const snapshot = async () =>
      Promise.all(
        (await readdir(diagrams)).sort().map(async (name) => [
          name,
          createHash('sha256')
            .update(await readFile(join(diagrams, name)))
            .digest('hex'),
        ]),
      );
    const reject = async (message: RegExp) => {
      const before = await snapshot();
      const result = check();
      assert.equal(result.status, 1, result.stdout);
      assert.match(result.stderr, message);
      assert.deepEqual(
        await snapshot(),
        before,
        'check must not repair or rewrite inputs',
      );
    };

    assert.equal(check().status, 0);
    for (const name of ['report-2.json', 'report_detail.json', 'Report.json']) {
      const path = join(diagrams, name);
      await writeFile(path, source);
      const result = check();
      assert.equal(result.status, 1, `${name} must not be silently ignored`);
      assert.ok(result.stderr.includes(name.slice(0, -5)), result.stderr);
      assert.deepEqual(await readFile(path), source);
      assert.deepEqual(
        await readFile(join(diagrams, 'manifest.json')),
        manifest,
      );
      await rm(path);
    }

    for (const [name, message] of [
      ['first-report.json', /Diagram source, HTML, SVG, or inventory changed/],
      ['first-report.html', /Diagram source, HTML, SVG, or inventory changed/],
      ['first-report.svg', /SVG differs from the delivered HTML export/],
      ['manifest.json', /Diagram source, HTML, SVG, or inventory changed/],
    ] as const) {
      const path = join(diagrams, name);
      const original = await readFile(path);
      const changed =
        name === 'manifest.json'
          ? Buffer.from(
              original
                .toString()
                .replace('"schemaVersion": 1', '"schemaVersion": 9'),
            )
          : Buffer.concat([original, Buffer.from('\n')]);
      await writeFile(path, changed);
      await reject(message);
      await writeFile(path, original);
    }
    for (const extension of ['html', 'svg']) {
      const path = join(diagrams, `orphan.${extension}`);
      await cp(join(diagrams, `first-report.${extension}`), path);
      await reject(new RegExp(`Unexpected ${extension} diagram inventory`));
      await rm(path);
    }
    const svgPath = join(diagrams, 'first-report.svg');
    const svg = await readFile(svgPath);
    await rm(svgPath);
    await reject(/first-report.svg/);
    await writeFile(svgPath, svg);

    const htmlPath = join(diagrams, 'first-report.html');
    const html = await readFile(htmlPath, 'utf8');
    await writeFile(
      htmlPath,
      html.replace(
        /(<meta name="generator" content=")archify [^"]+/,
        '$1archify 9.9.9',
      ),
    );
    await reject(
      /expected showcase source and archify 2\.17\.0-dev\.1 delivery/,
    );
    await writeFile(htmlPath, html);
    assert.equal(check().status, 0);
  } finally {
    await rm(copy, { recursive: true, force: true });
  }
});
