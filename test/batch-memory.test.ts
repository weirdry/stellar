import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

void test('batch memory comparison rejects unavailable baselines and invalid sizes before output creation and can retry the same path', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'stellar-batch-memory-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Synthetic',
        '-c',
        'user.email=synthetic@example.invalid',
        '-c',
        'commit.gpgsign=false',
        '-c',
        'core.hooksPath=/dev/null',
        ...args,
      ],
      { cwd: root, stdio: 'ignore' },
    );
  git('init', '--quiet');
  git('commit', '--quiet', '--allow-empty', '-m', 'empty history');
  const empty = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  // A manifest whose listed runner bytes do not match its hash.
  mkdirSync(join(root, 'bin'));
  writeFileSync(join(root, 'bin/stellar.mjs'), 'synthetic runner\n');
  writeFileSync(
    join(root, 'bin/stellar.manifest.json'),
    JSON.stringify({ files: { 'bin/stellar.mjs': '0'.repeat(64) } }),
  );
  git('add', 'bin');
  git('commit', '--quiet', '-m', 'mismatched runtime');
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  for (const path of [
    'scripts/bench/batch-memory.ts',
    'scripts/bench/common.ts',
    'scripts/bench/random.ts',
    'scripts/support/values.ts',
  ]) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(new URL('../' + path, import.meta.url), target);
  }
  const script = join(root, 'scripts/bench/batch-memory.ts');
  const output = join(root, 'result');
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [script, '--output', output, ...args], {
      cwd: root,
      encoding: 'utf8',
    });
  const cases: [string[], RegExp][] = [
    [
      ['--baseline', 'refs/heads/stellar-no-such-baseline'],
      /Baseline .* is unavailable/,
    ],
    [['--baseline', empty], /no complete runtime/],
    [['--baseline', 'HEAD'], /no complete runtime/],
    [['--issues', '39'], /at least 40/],
    [['--issues', 'many'], /at least 40/],
  ];
  for (const [args, message] of cases)
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = run(...args);
      assert.equal(result.status, 2, result.stderr);
      assert.equal(result.stdout, '');
      assert.match(result.stderr, message);
      assert.doesNotMatch(result.stderr, /\bat .*\.ts:\d/);
      assert.equal(existsSync(output), false);
    }
  const help = spawnSync(process.execPath, [script, '--help'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /Usage:/);
  assert.equal(existsSync(output), false);
});
