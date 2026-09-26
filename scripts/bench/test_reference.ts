// Optional executable benchmark tests, without performance thresholds.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { record, array } from '../support/values.ts';
import { digest, directory, hashes, join, json, writeJSON } from './common.ts';

const script = join(directory, 'benchmark.ts');
const protocol = {
  sizes: [100],
  trials: 1,
  fixture: digest(join(directory, 'fixtures.ts')),
};
function fixture(t: test.TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'stellar-benchmark-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function run(
  output: string,
  reference?: string,
  node = process.execPath,
  sizes = '100',
) {
  return spawnSync(
    process.execPath,
    [
      script,
      '--node',
      node,
      '--output',
      output,
      '--sizes',
      sizes,
      '--trials',
      '1',
      ...(reference ? ['--reference', reference] : []),
    ],
    { encoding: 'utf8', timeout: 60000 },
  );
}
function usage(result: SpawnSyncReturns<string>, message: string) {
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes(`error: ${message}`), result.stderr);
  assert.doesNotMatch(result.stderr, /\bat .*\.ts:\d/);
}
void test('invalid sizes fail before output or measured Node execution', (t) => {
  const root = fixture(t);
  for (const sizes of ['abc', '', '100,', '100,abc']) {
    const output = join(root, 'output');
    usage(
      run(output, undefined, join(root, 'absent-node'), sizes),
      'Sizes must be a comma-separated list of integers.',
    );
    assert.equal(existsSync(output), false);
  }
});
void test('existing benchmark output bytes are preserved', (t) => {
  const root = fixture(t),
    original = Buffer.from([
      ...Buffer.from('Existing caller-owned bytes.'),
      0,
      255,
    ]);
  for (const kind of ['file', 'directory']) {
    const output = join(root, kind);
    if (kind === 'directory') mkdirSync(output);
    const retained = kind === 'directory' ? join(output, 'keep.bin') : output;
    writeFileSync(retained, original);
    usage(
      run(output, undefined, join(root, 'absent-node')),
      'Output directory already exists; choose a fresh path.',
    );
    assert.deepEqual(readFileSync(retained), original);
    if (kind === 'directory')
      assert.deepEqual(readdirSync(output), ['keep.bin']);
  }
});
void test('invalid references fail before output or measured Node execution', (t) => {
  const root = fixture(t),
    valid = { protocol, artifacts: { '100/draft.json': 'a'.repeat(64) } };
  const cases: Record<string, unknown> = {
    'empty-object': {},
    'empty-array': [],
    null: null,
    false: false,
    zero: 0,
    'empty-string': '',
    scalar: 'invalid',
    'missing-protocol': { artifacts: valid.artifacts },
    'missing-artifacts': { protocol },
    'null-protocol': { ...valid, protocol: null },
    'list-protocol': { ...valid, protocol: [] },
    'mismatched-protocol': { ...valid, protocol: { ...protocol, trials: 2 } },
    'empty-artifacts': { ...valid, artifacts: {} },
    'null-artifacts': { ...valid, artifacts: null },
    'list-artifacts': { ...valid, artifacts: [] },
    'empty-name': { ...valid, artifacts: { '': 'a'.repeat(64) } },
    'short-hash': { ...valid, artifacts: { '100/draft.json': 'abc' } },
    'non-hex-hash': {
      ...valid,
      artifacts: { '100/draft.json': 'z'.repeat(64) },
    },
    'non-string-hash': { ...valid, artifacts: { '100/draft.json': 123 } },
  };
  const reject = (reference: string, output: string) => {
    usage(run(output, reference, join(root, 'absent-node')), 'Reference');
    assert.equal(existsSync(output), false);
  };
  for (const [name, value] of Object.entries(cases)) {
    const reference = join(root, `${name}.json`);
    writeJSON(reference, value);
    reject(reference, join(root, name));
  }
  for (const [name, bytes] of [
    ['malformed', Buffer.from('{')],
    ['encoding', Buffer.from([255])],
  ] as const) {
    const reference = join(root, `${name}.json`);
    writeFileSync(reference, bytes);
    reject(reference, join(root, name));
  }
  reject(join(root, 'absent.json'), join(root, 'missing'));
  reject(root, join(root, 'directory'));
});
void test(
  'benchmark baseline parity, damaged hash, and extra inventory are detected',
  { timeout: 240000 },
  (t) => {
    const root = fixture(t),
      baseline = join(root, 'baseline');
    let result = run(baseline);
    assert.equal(result.status, 0, result.stderr);
    const baselinePath = join(baseline, 'results.json'),
      original = readFileSync(baselinePath),
      before = record(json(baselinePath));
    assert.equal(before['reference_matched'], false);
    const candidate = join(root, 'candidate');
    result = run(candidate, baselinePath);
    assert.equal(result.status, 0, result.stderr);
    const after = record(json(join(candidate, 'results.json')));
    assert.equal(after['reference_matched'], true);
    assert.deepEqual(before['artifacts'], after['artifacts']);
    assert.equal(array(after['rows']).length, 4);
    assert.equal(array(after['receipts']).length, 2);
    for (const name of ['changed-hash', 'extra-artifact']) {
      const damaged = structuredClone(before),
        artifacts = hashes(damaged['artifacts']);
      artifacts[
        name === 'changed-hash' ? '100/initial-capture.json' : 'extra.json'
      ] = '0'.repeat(64);
      damaged['artifacts'] = artifacts;
      const reference = join(root, `${name}.json`);
      writeJSON(reference, damaged);
      const output = join(root, name);
      result = run(output, reference);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Reference artifact/);
      assert.equal(existsSync(join(output, 'results.json')), false);
    }
    assert.deepEqual(readFileSync(baselinePath), original);
  },
);

void test('benchmark and profiler help do not need inputs or create output', () => {
  for (const name of ['benchmark.ts', 'profile.ts'])
    for (const flag of ['-h', '--help']) {
      const result = spawnSync(
        process.execPath,
        [join(directory, name), flag],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Usage:/);
      assert.equal(result.stderr, '');
    }
});
