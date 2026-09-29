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

void test('instruction comparison rejects missing history before output creation and can retry the same path', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'stellar-instruction-reading-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync('git', ['init', '--quiet', root]);
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  for (const path of [
    'scripts/bench/instruction-reading.ts',
    'scripts/bench/common.ts',
    'scripts/bench/random.ts',
    'scripts/support/values.ts',
  ]) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(new URL('../' + path, import.meta.url), target);
  }
  const script = join(root, 'scripts/bench/instruction-reading.ts');
  const output = join(root, 'result');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(process.execPath, [script, '--output', output], {
      cwd: root,
      encoding: 'utf8',
    });
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Baseline .* is unavailable/);
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
