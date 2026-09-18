import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));

test('diagram inventory rejects unbuilt sources and unsupported names without mutation', async () => {
  const copy = await mkdtemp(join(tmpdir(), 'stellar-diagrams-'));
  try {
    const scripts = join(copy, 'scripts/docs');
    const diagrams = join(copy, 'docs/architecture/diagrams');
    await mkdir(scripts, { recursive: true });
    await mkdir(diagrams, { recursive: true });
    const checker = join(scripts, 'diagrams.mjs');
    await cp(join(root, 'scripts/docs/diagrams.mjs'), checker);
    await cp(join(root, 'docs/architecture/diagrams'), diagrams, {
      recursive: true,
    });
    const manifest = await readFile(join(diagrams, 'manifest.json'));
    const source = await readFile(join(diagrams, 'first-report.json'));
    const check = () =>
      spawnSync(process.execPath, [checker, 'check'], { encoding: 'utf8' });

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
    assert.equal(check().status, 0);
  } finally {
    await rm(copy, { recursive: true, force: true });
  }
});
