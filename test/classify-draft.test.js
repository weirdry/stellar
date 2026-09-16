import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  stat,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  classifyDraft,
  applyChoices,
  refreshState,
  assertState,
} from '../lib/continuity.js';
import { normalizeCapture } from '../lib/normalize.js';
import { mixedCapture } from './fixtures.js';

const example = JSON.parse(
  await readFile(new URL('../examples/mixed-choices.json', import.meta.url)),
);
const choices = () => structuredClone(example);
const draft = () => normalizeCapture(mixedCapture());
const strip = (map) => ({
  ...map,
  domains: [],
  categories: [],
  issues: map.issues.map(
    ({ classification: _classification, targets: _targets, ...fact }) => ({
      ...fact,
      targets: [],
    }),
  ),
});
const rejectAt = (fn, path) =>
  assert.throws(fn, (error) => {
    assert.ok(
      error.diagnostics?.some((d) => d.path === path && d.fix),
      JSON.stringify(error.diagnostics),
    );
    assert.ok(
      !JSON.stringify(error.diagnostics).includes('private-probe-text'),
    );
    return true;
  });

test('initial choices preserve all facts and distinguish repeated display identifiers', () => {
  const map = draft(),
    decisions = choices(),
    before = structuredClone({ map, decisions });
  const state = classifyDraft(map, decisions);
  assert.deepEqual({ map, decisions }, before);
  assert.deepEqual(strip(state.map), map);
  assert.deepEqual(
    state.map.issues.slice(0, 4).map((i) => i.classification.category),
    ['transit', 'transit', 'control', 'delivery'],
  );
  assert.ok(
    state.map.issues
      .slice(0, 4)
      .every((i) => i.classification.origin === 'agent'),
  );
  assert.equal(state.map.issues[4].classification, undefined);
  assert.deepEqual(state.map.issues[2].targets, [
    'Reliable observatory operations',
  ]);
  assert.deepEqual(state.changes, {
    added: [],
    returned: [],
    updated: [],
    notObserved: [],
    review: [],
    preservedUser: [],
  });
  assertState(state);
  assert.deepEqual(refreshState(state, mixedCapture()).map, state.map);
});

test('initial decisions reject incomplete assignments, invalid facts and invalid choices', () => {
  const incomplete = choices();
  incomplete.issues.pop();
  rejectAt(
    () => classifyDraft(draft(), incomplete),
    '/issues/3/classification',
  );
  const invalid = draft();
  invalid.relations[0].target = 'absent';
  rejectAt(() => classifyDraft(invalid, choices()), '/relations/0/target');
  for (const [edit, path] of [
    [
      (c) => {
        c.issues[0].title = 'private-probe-text';
      },
      '/issues/0/title',
    ],
    [
      (c) => {
        c.issues[0].classification.origin = 'user';
      },
      '/issues/0/classification/origin',
    ],
    [
      (c) => {
        c.issues[0].issueId = 'OBS-1';
      },
      '/issues/0/issueId',
    ],
    [
      (c) => {
        c.issues.push(c.issues[0]);
      },
      '/issues/4/issueId',
    ],
    [
      (c) => {
        c.categories[0].domain = 'absent';
      },
      '/categories/0/domain',
    ],
    [
      (c) => {
        c.issues[0].classification.category = 'absent';
      },
      '/issues/0/classification/category',
    ],
  ]) {
    const c = choices();
    edit(c);
    rejectAt(() => classifyDraft(draft(), c), path);
  }
});

test('partially interpreted drafts retain user authority and reject conflicting agent decisions', () => {
  const map = draft(),
    c = choices();
  map.domains = structuredClone(c.domains);
  map.categories = structuredClone(c.categories);
  map.issues[0].classification = {
    ...c.issues[0].classification,
    origin: 'user',
  };
  map.issues[0].targets = ['User target'];
  const state = classifyDraft(map, c);
  assert.equal(state.map.issues[0].classification.origin, 'user');
  assert.equal(state.memory[0].targetsOrigin, 'user');
  for (const [edit, path] of [
    [
      (d) => {
        d.issues[0].classification.rationale = 'private-probe-text';
      },
      '/issues/0/classification',
    ],
    [
      (d) => {
        d.issues[0].targets = [];
      },
      '/issues/0/targets',
    ],
    [
      (d) => {
        d.categories[0].basis = 'private-probe-text';
      },
      '/categories/0',
    ],
  ]) {
    const changed = choices();
    edit(changed);
    rejectAt(() => classifyDraft(map, changed), path);
  }
  const revised = applyChoices(
    state,
    {
      issues: [
        {
          issueId: map.issues[1].id,
          classification: { category: 'delivery', rationale: 'User grouping' },
          targets: [],
        },
      ],
    },
    'user',
  );
  const capture = mixedCapture();
  capture.records[1].data.description = 'A changed source objective';
  const refreshed = refreshState(revised, capture);
  assert.equal(refreshed.map.issues[1].classification.origin, 'user');
  assert.equal(refreshed.map.issues[1].classification.category, 'delivery');
  assert.ok(refreshed.changes.preservedUser.includes(map.issues[1].id));
});

test('initial CLI run renders and verifies, while errors preserve inputs and earlier output', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-first-run-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const capture = join(dir, 'capture.json'),
    input = join(dir, 'draft.json'),
    decisionPath = join(dir, 'choices.json'),
    output = join(dir, 'run');
  await writeFile(capture, JSON.stringify(mixedCapture()));
  await writeFile(decisionPath, JSON.stringify(choices()));
  assert.equal(run('normalize', capture, input).status, 0);
  const inputs = await Promise.all(
    [capture, input, decisionPath].map((p) => readFile(p, 'utf8')),
  );
  const result = run('classify-draft', input, decisionPath, output);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).needsClassification, 0);
  const mapPath = join(output, 'work-map.json'),
    statePath = join(output, 'state.json'),
    html = join(output, 'stellar.html');
  assert.equal(run('render', mapPath, html).status, 0);
  const verified = run('verify-run', capture, mapPath, html, statePath);
  assert.equal(verified.status, 0, verified.stderr);
  assert.deepEqual(JSON.parse(verified.stdout).checks, {
    captureFacts: 'pass',
    embeddedMap: 'pass',
    bundledViewer: 'pass',
    stateMap: 'pass',
  });
  assert.equal((await stat(output)).mode & 0o777, 0o700);
  for (const name of [
    'state.json',
    'work-map.json',
    'changes.json',
    'stellar.html',
  ])
    assert.equal((await stat(join(output, name))).mode & 0o777, 0o600);
  const stateBytes = await readFile(statePath, 'utf8');
  const alias = join(dir, 'alias');
  await symlink(output, alias);
  for (const occupied of [output, alias, input, decisionPath]) {
    const rejected = run('classify-draft', input, decisionPath, occupied);
    assert.equal(rejected.status, 1);
    assert.equal(JSON.parse(rejected.stderr).diagnostics[0].path, '/run');
  }
  for (const [name, data, role] of [
    ['malformed-map', '{"private-probe-text":', 'work-map'],
    ['malformed-choices', '{"private-probe-text":', 'choices'],
  ]) {
    const bad = join(dir, name),
      failed = join(dir, name + '-run');
    await writeFile(bad, data);
    const rejected = run(
      'classify-draft',
      role === 'work-map' ? bad : input,
      role === 'choices' ? bad : decisionPath,
      failed,
    );
    assert.equal(rejected.status, 1);
    assert.equal(JSON.parse(rejected.stderr).diagnostics[0].input, role);
    assert.ok(!rejected.stderr.includes('private-probe-text'));
    await assert.rejects(stat(failed), { code: 'ENOENT' });
  }
  const incomplete = join(dir, 'incomplete.json'),
    failed = join(dir, 'incomplete-run');
  await writeFile(incomplete, JSON.stringify({ domains: choices().domains }));
  assert.equal(run('classify-draft', input, incomplete, failed).status, 1);
  await assert.rejects(stat(failed), { code: 'ENOENT' });
  assert.equal(
    run('classify-draft', statePath, decisionPath, failed).status,
    1,
  );
  await assert.rejects(stat(failed), { code: 'ENOENT' });
  const localReference = draft();
  localReference.attachments = [
    { title: 'Note', note: 'Local context', href: 'private-probe-text.html' },
  ];
  const relativeMap = join(dir, 'relative.json');
  await writeFile(relativeMap, JSON.stringify(localReference));
  const refused = run('classify-draft', relativeMap, decisionPath, failed);
  assert.equal(refused.status, 1);
  assert.ok(
    JSON.parse(refused.stderr).diagnostics.some(
      (d) => d.path === '/attachments/0/href',
    ),
  );
  assert.ok(!refused.stderr.includes('private-probe-text'));
  await assert.rejects(stat(failed), { code: 'ENOENT' });
  assert.equal(run('classify-draft', input, decisionPath).status, 2);
  assert.equal(
    run('classify-draft', input, decisionPath, failed, 'extra').status,
    2,
  );
  assert.deepEqual(
    await Promise.all(
      [capture, input, decisionPath].map((p) => readFile(p, 'utf8')),
    ),
    inputs,
  );
  assert.equal(await readFile(statePath, 'utf8'), stateBytes);
});
