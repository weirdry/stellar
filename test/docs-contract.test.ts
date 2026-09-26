import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(
  new URL('../scripts/docs/check-contract.ts', import.meta.url),
);
void test('documentation checker enforces canonical structure, state, indexing and links without writes', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-docs-contract-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const files: Record<string, string> = {
    'docs/README.md': '# Docs\n',
    'docs/development/documentation.md': '# Policy\n',
    'docs/architecture/diagrams/README.md': '# Diagrams\n',
    'docs/architecture/diagrams/manifest.json': '{}\n',
    'docs/decisions/README.md': '0001-example.md\n',
    'docs/decisions/0001-example.md': 'Status: **Accepted**\n',
  };
  const chapters = (
    await readdir(new URL('../docs/architecture/', import.meta.url))
  ).filter((name) => /^\d{2}-.*\.md$/.test(name));
  files['docs/architecture/README.md'] =
    'Authority: **Canonical**\nScope: **Stellar**\nDocumentation profile: **stellar-arc42-v1**\n' +
    chapters.join('\n') +
    '\n';
  for (const chapter of chapters)
    files[`docs/architecture/${chapter}`] = 'State: **As-built**\n';
  files['docs/architecture/09-architecture-decisions.md'] +=
    '0001-example.md\n';
  async function put(path: string, text: string) {
    await mkdir(dirname(join(dir, path)), { recursive: true });
    await writeFile(join(dir, path), text);
  }
  for (const [path, text] of Object.entries(files)) await put(path, text);
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [checker, ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
  assert.equal(run().status, 0);
  assert.equal(run('--target', dir).status, 0);
  for (const args of [
    ['--target'],
    ['--unknown'],
    ['--target', join(dir, 'absent')],
  ])
    assert.equal(run(...args).status, 2);
  for (const help of ['-h', '--help']) assert.equal(run(help).status, 0);
  for (const [path, text, message] of [
    ['docs/README.md', '', /required documentation file/],
    [
      'docs/architecture/README.md',
      'Scope: **Stellar**\n',
      /canonical authority/,
    ],
    [
      'docs/architecture/01-introduction-goals.md',
      '# Goals\n',
      /recognized default State/,
    ],
    [
      'docs/decisions/0002-probe.md',
      'Status: Invalid\n',
      /recognized lifecycle status/,
    ],
    ['docs/decisions/0002-probe.md', 'Status: Accepted\n', /ADR is missing/],
    ['probe.md', 'trailing \n', /trailing whitespace/],
    ['probe.md', '{{UNRESOLVED}}\n', /scaffold token/],
    [
      'probe.md',
      '[missing](absent.md#heading)\n',
      /broken local Markdown link/,
    ],
  ] as const) {
    await put(path, text);
    const result = run();
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, message);
    assert.equal(await readFile(join(dir, path), 'utf8'), text);
    const original = files[path];
    if (original === undefined) await rm(join(dir, path));
    else await put(path, original);
  }
  for (const directory of [
    'local',
    'outputs',
    'node_modules',
    '.git',
    '.cache',
    '.venv',
    'dist',
    'coverage',
  ])
    await put(`${directory}/ignored.md`, '{{IGNORE}} [missing](absent.md) \n');
  await put(
    'probe.md',
    '[local](docs/README.md#heading) [root](/docs/README.md?query#heading) [web](https://example.invalid) [mail](mailto:a@example.invalid) [anchor](#heading)\n',
  );
  assert.equal(run().status, 0, run().stderr);
});
