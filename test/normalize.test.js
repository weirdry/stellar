import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeCapture } from '../lib/normalize.js';
import { validateWorkMap } from '../lib/validate.js';
import { mixedCapture, mixedMap } from './fixtures.js';

const rejected = (mutate, pattern) => {
  const capture = mixedCapture();
  mutate(capture);
  assert.throws(
    () => normalizeCapture(capture),
    (error) => error.diagnostics?.some((d) => pattern.test(d.message) && d.fix),
  );
};
test('mixed native records preserve facts, resolve Linear aliases and distinguish repository-local issue numbers', () => {
  const capture = mixedCapture(),
    before = structuredClone(capture);
  const map = normalizeCapture(capture);
  assert.deepEqual(capture, before);
  assert.deepEqual(map, normalizeCapture(capture));
  assert.equal(map.issues.length, 5);
  const [linear, child, control, delivery, closed] = map.issues;
  assert.equal(linear.nativeId, capture.records[0].data.uuid);
  assert.equal(linear.title, capture.records[0].data.title);
  assert.equal(linear.description, capture.records[0].data.description);
  assert.deepEqual(linear.status, { type: 'started', label: 'Investigating' });
  assert.equal(control.identifier, delivery.identifier);
  assert.notEqual(control.id, delivery.id);
  assert.equal(control.status.type, 'unstarted');
  assert.equal(closed.status.type, 'canceled');
  assert.equal(
    map.relations.length,
    3,
    'outgoing/incoming observations of one blocker deduplicate',
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' && e.source === linear.id && e.target === child.id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'parent' && e.source === linear.id && e.target === child.id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' &&
        e.source === delivery.id &&
        e.target === control.id,
    ),
  );
  assert.ok(
    validateWorkMap(map).diagnostics.every(
      (d) => d.code === 'missing-classification',
    ),
  );
  assert.equal(validateWorkMap(mixedMap()).valid, true);
});
test('unfetched relation endpoints stay context with unknown status, without inventing inferred edges', () => {
  const capture = mixedCapture();
  capture.records[0].data.relations.relatedTo = [
    { id: 'OBS-99', title: 'Unfetched spectral study' },
  ];
  capture.records[0].data.relations.duplicateOf = { id: 'OBS-100' };
  capture.records[1].data.description =
    'Same words and URL mention as another issue.';
  const map = normalizeCapture(capture),
    unknown = map.issues.find((i) => i.identifier === 'OBS-99');
  assert.equal(unknown.scope, 'context');
  assert.equal(unknown.detail, 'unqueried');
  assert.equal(unknown.status.type, 'unknown');
  assert.equal(map.relations.length, 5);
  assert.ok(
    map.relations.some(
      (e) => e.kind === 'duplicate' && e.source === map.issues[0].id,
    ),
  );
});
test('normalization rejects contradictory identity, malformed references and false complete coverage', () => {
  rejected((c) => c.records.push(c.records[0]), /more than once/);
  rejected((c) => {
    c.records[1].data.id = c.records[0].data.id;
  }, /conflicting/);
  rejected((c) => {
    c.records[2].data.pull_request = {};
  }, /pull request/);
  rejected((c) => {
    c.records[2].sourceId = 'github-delivery';
  }, /another repository/);
  rejected((c) => {
    c.sources[0].coverage.relations = 'complete';
  }, /missing or malformed/);
  rejected((c) => {
    c.records[0].data.relations.blocks = ['OBS-9'];
  }, /not an issue reference/);
  rejected((c) => {
    c.records[2].links.blockedBy[0].html_url =
      'https://github.com/example/elsewhere/issues/7';
  }, /undeclared/);
  rejected((c) => {
    c.records[0].data.url = 'https://user:secret@example.com';
  }, /without credentials/);
  rejected((c) => {
    c.sources[0].provider = 'jira';
  }, /No native normalizer/);
});
test('status mapping retains unknown closed reasons and never guesses a started state', () => {
  const capture = mixedCapture();
  capture.records[0].data.statusType = 'triage';
  assert.deepEqual(normalizeCapture(capture).issues[0].status, {
    type: 'unknown',
    label: 'Investigating',
  });
  for (const reason of [null, 'duplicate', 'new-future-reason']) {
    capture.records[4].data.state_reason = reason;
    const status = normalizeCapture(capture).issues[4].status;
    assert.equal(status.type, 'unknown');
    assert.equal(status.label, reason ? 'closed · ' + reason : 'closed');
  }
  capture.records[4].data.state_reason = 'completed';
  assert.equal(normalizeCapture(capture).issues[4].status.type, 'completed');
});

test('ambiguous native references and noncanonical repository namespaces are rejected', () => {
  rejected((c) => {
    c.records[0].data.relations.blocks = [
      { id: 'OBS-1', uuid: c.records[1].data.uuid },
    ];
  }, /disagree/);
  rejected((c) => {
    c.sources[1].namespace = 'GitHub.com/Example/Control';
  }, /lowercase/);
  rejected((c) => {
    c.records[2].links.blockedBy[0].number = 0;
  }, /not an issue/);
});
test('source contract rejects missing sources, repeated native identities and duplicate namespaces', () => {
  for (const [mutate, code] of [
    [
      (d) => {
        d.issues[0].sourceId = 'absent';
      },
      'unknown-source',
    ],
    [
      (d) => {
        d.issues[1].nativeId = d.issues[0].nativeId;
      },
      'duplicate-native-id',
    ],
    [
      (d) => {
        d.sources[2].namespace = d.sources[1].namespace;
      },
      'duplicate-source',
    ],
  ]) {
    const map = mixedMap();
    mutate(map);
    assert.ok(validateWorkMap(map).diagnostics.some((d) => d.code === code));
  }
});
test('normalize CLI writes a private draft, protects captures and preserves earlier output on failure', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-normalize-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = join(dir, 'capture.json'),
    output = join(dir, 'draft.json');
  const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
  const run = (out = output) =>
    spawnSync(process.execPath, [cli, 'normalize', input, out], {
      cwd: dir,
      encoding: 'utf8',
    });
  await writeFile(input, JSON.stringify(mixedCapture()));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).needsClassification, 4);
  const before = await readFile(output, 'utf8');
  assert.deepEqual(JSON.parse(before), normalizeCapture(mixedCapture()));
  assert.equal(run(input).status, 1);
  const alias = join(dir, 'alias.json');
  await symlink(input, alias);
  assert.equal(run(alias).status, 1);
  await writeFile(input, '{"private-sensitive-title":');
  assert.equal(run().status, 1);
  assert.ok(!run().stderr.includes('private-sensitive-title'));
  assert.equal(await readFile(output, 'utf8'), before);
});
