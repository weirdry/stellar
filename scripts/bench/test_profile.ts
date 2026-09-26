import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compact,
  cpuSummary,
  frameKey,
  heapSummary,
} from './profile-analysis.ts';
import { parseTime } from './common.ts';
import { required } from '../support/values.ts';

const stage = '/tmp/synthetic/staged-skill',
  script = '/tmp/synthetic/heap-sample.ts';
const frame = (functionName: string) => ({
  functionName,
  url: 'file:///tmp/synthetic/staged-skill/bin/stellar.mjs',
  lineNumber: 9,
  columnNumber: 0,
});
void test('compact attribution preserves omitted self totals and named inclusive phases', () => {
  const self = Array.from({ length: 40 }, (_, index) => ({
    function: `f${index}`,
    url: 'bin/stellar.mjs',
    line: 1,
    column: 1,
    us: 40 - index,
  }));
  const summary = compact(
    {
      self,
      inclusive: [
        ...self,
        {
          function: 'normalizeCapture',
          url: 'bin/stellar.mjs',
          line: 1,
          column: 1,
          us: 1,
        },
      ],
    },
    'cpu',
  );
  assert.equal(summary.self.length, 20);
  assert.equal(summary.unlisted_self_us, 210);
  assert.equal(
    summary.self.reduce((sum, row) => sum + row.us, 0) +
      required(summary.unlisted_self_us),
    820,
  );
  assert.ok(
    summary.inclusive.some((row) => row.function === 'normalizeCapture'),
  );
});
void test('CPU attribution counts recursion once per sample and validates aligned deltas', () => {
  const raw = {
    nodes: [
      { id: 1, callFrame: frame('root'), children: [2, 4] },
      { id: 2, callFrame: frame('validate'), children: [3] },
      { id: 3, callFrame: frame('validate') },
      { id: 4, callFrame: frame('parse') },
    ],
    samples: [3, 4],
    timeDeltas: [100, 300],
    startTime: 0,
    endTime: 500,
  };
  const summary = cpuSummary(raw, stage, script);
  assert.equal(summary.sample_count, 2);
  assert.equal(summary.sampled_us, 400);
  assert.equal(summary.profile_duration_us, 500);
  assert.deepEqual(
    Object.fromEntries(summary.self.map((f) => [f.function, f.us])),
    { parse: 300, validate: 100 },
  );
  assert.deepEqual(
    Object.fromEntries(summary.inclusive.map((f) => [f.function, f.us])),
    { root: 400, parse: 300, validate: 100 },
  );
  for (const timeDeltas of [[100], [100, -1]])
    assert.throws(
      () => cpuSummary({ ...raw, timeDeltas }, stage, script),
      /must align/,
    );
});
void test('heap attribution preserves allocation total and deduplicates recursion', () => {
  const parameters = { samplingInterval: 524288 };
  const raw = {
    parameters,
    profile: {
      head: {
        callFrame: frame('root'),
        selfSize: 0,
        children: [
          {
            callFrame: frame('clone'),
            selfSize: 10,
            children: [{ callFrame: frame('clone'), selfSize: 30 }],
          },
          { callFrame: frame('parse'), selfSize: 20 },
        ],
      },
    },
  };
  const summary = heapSummary(raw, stage, script);
  assert.equal(summary.estimated_allocated_bytes, 60);
  assert.deepEqual(summary.parameters, parameters);
  assert.deepEqual(
    Object.fromEntries(summary.inclusive.map((f) => [f.function, f.bytes])),
    { root: 60, clone: 40, parse: 20 },
  );
});
void test('profile paths redact unrelated absolute files', () => {
  assert.equal(
    frameKey(
      { ...frame('f'), url: 'file:///private/person/probe.mjs' },
      stage,
      script,
    ).url,
    'external-file/probe.mjs',
  );
  assert.equal(
    frameKey(
      { ...frame('f'), url: 'file:///tmp/synthetic/heap-sample.ts' },
      stage,
      script,
    ).url,
    'profiler/heap-sample.ts',
  );
});
void test('system time parsers preserve direct-child CPU and normalize platform RSS', () => {
  assert.deepEqual(
    parseTime(
      '0.25 real 0.12 user 0.03 sys\n 10485760 maximum resident set size\n',
      'darwin',
    ),
    { cpu_ms: 150, peak_rss_mib: 10 },
  );
  assert.deepEqual(
    parseTime('stellar-user=0.12 system=0.03\nstellar-maxrss=10240\n', 'linux'),
    { cpu_ms: 150, peak_rss_mib: 10 },
  );
  assert.throws(() => parseTime('', 'darwin'));
  assert.throws(() =>
    parseTime('stellar-user=NaN system=0.03\nstellar-maxrss=10240', 'linux'),
  );
});

void test('seeded shuffle preserves Python operation ordering across trials and generator blocks', () => {
  for (const [seed, count, hashes] of [
    [
      20260920,
      24,
      ['451a95679793bf65ef2ed08cb79226bea9f38fe5f58c0fa869870a0aa49286f0'],
    ],
    [
      20261020,
      4,
      [
        'f2f991d74dfbb2edf7f4475dcb7d82989de00a71e44bb11d4a6fbb49442577b6',
        'b2b372364f2f30ed1a68707f117dc9d77857706cb0c260724b54d1ab456580a9',
        '5f9be8d2dd96dab22887f19a1a2beea2d85f3fc34e2041ca0496fe50548f7149',
        'a364a13fdce8107ce4bbc8a0fce617f6e9f19514606679f994fa235e2374b764',
        '659034d22129aa1febfc9f6ad626df4293980a5a4d5fad727a0cf86cb0533dcf',
      ],
    ],
    [
      20261920,
      4,
      [
        '0bda8c2dcb80177a09b5825e22afb42a807163e9323ff7aa243a83c84576dc5e',
        'f8ea257b6683e4a627eb92d601f589d0bc077b6f3e8dc07ba49b8c9da8c56409',
        '5fb298032c226a77f7a60bd7b56b580c82a1e8962944a6812a42480717e1029f',
        'f96a8884ca2194c7b0e45fb28ea7151c729edaa7cd0e028e7adf8576e56d8c7f',
        '1b928d7b68dcb31d8fc4e1f464e3657806dd31847e900e102fe7820a9b085d80',
      ],
    ],
    [
      20310920,
      3,
      [
        '4618fb980d25a4f13b15ece3799bb61983c678fc1bcf1274183bb16e8a196abc',
        '434026bd98ff2d8a2fb346c89ae9de006d1e2a6862832b6b3cd86e51de36d5c5',
        'a50c12ec8e20411bc79e811c15b13a8ea16e58f08d1c8015c257f83f6bc1c3fd',
        '4618fb980d25a4f13b15ece3799bb61983c678fc1bcf1274183bb16e8a196abc',
        'a50c12ec8e20411bc79e811c15b13a8ea16e58f08d1c8015c257f83f6bc1c3fd',
      ],
    ],
    [
      4294967297,
      700,
      [
        '9222e5619f647119e0beae023b9211cfb3e9b4dff6b5228b29aab879c2e63763',
        '7b8823a714bfef14f30e97c69a04a8e1482c75a92dbc36096903e4b984255ed2',
      ],
    ],
  ] as const) {
    const values = Array.from({ length: count }, (_, i) => i),
      next = random(seed);
    for (const expected of hashes) {
      shuffle(values, next);
      assert.equal(
        createHash('sha256').update(JSON.stringify(values)).digest('hex'),
        expected,
      );
    }
  }
});

import { createHash } from 'node:crypto';
import { random, shuffle } from './random.ts';

import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, contained } from './common.ts';
void test('retained artifact resolution rejects traversal and symlink escapes', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'stellar-profile-path-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'data');
  mkdirSync(root);
  writeFileSync(join(root, 'safe.json'), '{}');
  writeFileSync(join(dir, 'outside.json'), '{}');
  assert.match(contained(root, 'safe.json'), /safe.json$/);
  for (const name of ['../outside.json', join(dir, 'outside.json')])
    assert.throws(() => contained(root, name), /escapes/);
  symlinkSync('../outside.json', join(root, 'link.json'));
  assert.throws(() => contained(root, 'link.json'), /escapes/);
  assert.throws(() => contained(root, '.'), /escapes/);
});
