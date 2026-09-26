import { objectJSON } from './support.ts';
import { property } from '../lib/contracts.ts';
import { failure as readFailure } from './support.ts';
import type choiceFixture from '../examples/mixed-choices.json';
type Choices = typeof choiceFixture;
import { must } from './support.ts';
import { getDiagnostics } from './support.ts';
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
} from '../lib/continuity.ts';
import { normalizeCapture } from '../lib/normalize.ts';
import { validateWorkMap } from '../lib/validate.ts';
import { mixedCapture } from './fixtures.ts';
import type { StellarWorkMap } from '../types/generated/state.js';

const example = JSON.parse(
  await readFile(
    new URL('../examples/mixed-choices.json', import.meta.url),
    'utf8',
  ),
) as Choices;
const choices = () => structuredClone(example);
const draft = () => normalizeCapture(mixedCapture());
const strip = (map: StellarWorkMap) => ({
  ...map,
  domains: [],
  categories: [],
  issues: map.issues.map(
    ({ classification: _classification, targets: _targets, ...fact }) => {
      void _classification;
      void _targets;
      return { ...fact, targets: [] };
    },
  ),
});
const rejectAt = (fn: () => unknown, path: string) =>
  assert.throws(fn, (error) => {
    assert.ok(
      getDiagnostics(error).some((d) => d.path === path && d.fix),
      JSON.stringify(getDiagnostics(error)),
    );
    assert.ok(
      !JSON.stringify(getDiagnostics(error)).includes('private-probe-text'),
    );
    return true;
  });

void test('initial choices preserve all facts and distinguish repeated display identifiers', () => {
  const map = draft(),
    decisions = choices(),
    before = structuredClone({ map, decisions });
  const state = classifyDraft(map, decisions);
  assert.deepEqual({ map, decisions }, before);
  assert.deepEqual(strip(state.map), map);
  assert.deepEqual(
    state.map.issues.slice(0, 4).map((i) => must(i.classification).category),
    ['transit', 'transit', 'control', 'delivery'],
  );
  assert.ok(
    state.map.issues
      .slice(0, 4)
      .every((i) => must(i.classification).origin === 'agent'),
  );
  assert.equal(must(state.map.issues[4]).classification, undefined);
  assert.deepEqual(must(state.map.issues[2]).targets, [
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

void test('initial decisions reject incomplete assignments, invalid facts and invalid choices', () => {
  const incomplete = choices();
  must(incomplete.issues).pop();
  rejectAt(
    () => classifyDraft(draft(), incomplete),
    '/issues/3/classification',
  );
  const invalid = draft();
  must(invalid.relations[0]).target = 'absent';
  rejectAt(() => classifyDraft(invalid, choices()), '/relations/0/target');
  for (const [edit, path] of [
    [
      (c: Choices) => {
        Reflect.set(must(must(c.issues)[0]), 'title', 'private-probe-text');
      },
      '/issues/0/title',
    ],
    [
      (c: Choices) => {
        Reflect.set(must(c.issues[0]).classification, 'origin', 'user');
      },
      '/issues/0/classification/origin',
    ],
    [
      (c: Choices) => {
        must(must(c.issues)[0]).issueId = 'OBS-1';
      },
      '/issues/0/issueId',
    ],
    [
      (c: Choices) => {
        must(c.issues).push(must(must(c.issues)[0]));
      },
      '/issues/4/issueId',
    ],
    [
      (c: Choices) => {
        must(must(c.categories)[0]).domain = 'absent';
      },
      '/categories/0/domain',
    ],
    [
      (c: Choices) => {
        must(must(c.issues[0]).classification).category = 'absent';
      },
      '/issues/0/classification/category',
    ],
  ] as const) {
    const c = choices();
    edit(c);
    rejectAt(() => classifyDraft(draft(), c), path);
  }
});

void test('incomplete first-run choices can be repaired through the draft-relative diagnostic', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-first-run-repair-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const map = draft(),
    decisions = choices();
  map.issues.reverse();
  const omitted = map.issues[1];
  must(omitted).title = 'private-probe-text';
  must(omitted).description = 'private-probe-text';
  const withheld = must(decisions.issues).find(
    (item: { issueId: string }) => item.issueId === must(omitted).id,
  );
  decisions.issues = must(decisions.issues)
    .filter((item) => item !== withheld)
    .reverse();
  const input = join(dir, 'draft.json'),
    decisionPath = join(dir, 'choices.json'),
    output = join(dir, 'run'),
    cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
  const run = () =>
    spawnSync(
      process.execPath,
      [cli, 'classify-draft', input, decisionPath, output],
      {
        cwd: dir,
        encoding: 'utf8',
      },
    );
  await writeFile(input, JSON.stringify(map));
  await writeFile(decisionPath, JSON.stringify(decisions));
  const rejected = run();
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.equal(rejected.stdout, '');
  assert.ok(!rejected.stderr.includes('private-probe-text'));
  const [diagnostic] = readFailure(rejected.stderr).diagnostics;
  assert.equal(must(diagnostic).code, 'missing-classification');
  assert.equal(must(diagnostic).input, 'work-map');
  assert.equal(must(diagnostic).path, '/issues/1/classification');
  assert.match(must(diagnostic).fix, /issueId/);
  assert.match(must(diagnostic).fix, /Omit origin/);
  await assert.rejects(stat(output), { code: 'ENOENT' });

  // Resolve the pointer against the draft, then supply only choices fields.
  const issue = must(diagnostic)
    .path.split('/')
    .slice(1, -1)
    .reduce<unknown>((value, part) => property(value, part), map);
  must(decisions.issues).push({
    issueId: String(property(issue, 'id')),
    classification: {
      category: must(must(withheld).classification).category,
      rationale: must(must(withheld).classification).rationale,
    },
  });
  await writeFile(decisionPath, JSON.stringify(decisions));
  const repaired = run();
  assert.equal(repaired.status, 0, repaired.stderr);
  const state = assertState(
    JSON.parse(await readFile(join(output, 'state.json'), 'utf8')),
  );
  assert.equal(must(must(state.map.issues[1]).classification).origin, 'agent');
  assert.deepEqual(strip(state.map), map);
  assertState(state);
  assert.deepEqual(JSON.parse(await readFile(input, 'utf8')), map);

  // Standalone map validation still explains its own origin requirement.
  const standalone = validateWorkMap(map).diagnostics.find(
    (item) => item.path === must(diagnostic).path,
  );
  assert.equal(
    must(standalone).fix,
    'Assign one existing category with rationale and origin.',
  );
});

void test('partially interpreted drafts retain user authority and reject conflicting agent decisions', () => {
  const map = draft(),
    c = choices();
  map.domains = structuredClone(c.domains);
  map.categories = structuredClone(c.categories);
  must(map.issues[0]).classification = {
    ...must(must(c.issues)[0]).classification,
    origin: 'user',
  };
  must(map.issues[0]).targets = ['User target'];
  const state = classifyDraft(map, c);
  assert.equal(must(must(state.map.issues[0]).classification).origin, 'user');
  assert.equal(must(state.memory[0]).targetsOrigin, 'user');
  for (const [edit, path] of [
    [
      (d: Choices) => {
        must(must(d.issues[0]).classification).rationale = 'private-probe-text';
      },
      '/issues/0/classification',
    ],
    [
      (d: Choices) => {
        must(must(d.issues)[0]).targets = [];
      },
      '/issues/0/targets',
    ],
    [
      (d: Choices) => {
        must(must(d.categories)[0]).basis = 'private-probe-text';
      },
      '/categories/0',
    ],
  ] as const) {
    const changed = choices();
    edit(changed);
    rejectAt(() => classifyDraft(map, changed), path);
  }
  const revised = applyChoices(
    state,
    {
      issues: [
        {
          issueId: must(map.issues[1]).id,
          classification: { category: 'delivery', rationale: 'User grouping' },
          targets: [],
        },
      ],
    },
    'user',
  );
  const capture = mixedCapture();
  must(capture.records[1]).data.description = 'A changed source objective';
  const refreshed = refreshState(revised, capture);
  assert.equal(
    must(must(refreshed.map.issues[1]).classification).origin,
    'user',
  );
  assert.equal(
    must(must(refreshed.map.issues[1]).classification).category,
    'delivery',
  );
  assert.ok(refreshed.changes.preservedUser.includes(must(map.issues[1]).id));
});

void test('initial CLI run renders and verifies, while errors preserve inputs and earlier output', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-first-run-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
  const run = (...args: string[]) =>
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
  assert.equal(objectJSON(result.stdout)['needsClassification'], 0);
  const mapPath = join(output, 'work-map.json'),
    statePath = join(output, 'state.json'),
    html = join(output, 'stellar.html');
  assert.equal(run('render', mapPath, html).status, 0);
  const verified = run('verify-run', capture, mapPath, html, statePath);
  assert.equal(verified.status, 0, verified.stderr);
  assert.deepEqual(objectJSON(verified.stdout)['checks'], {
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
    assert.equal(
      must(readFailure(rejected.stderr).diagnostics[0]).path,
      '/run',
    );
  }
  for (const [name, data, role] of [
    ['malformed-map', '{"private-probe-text":', 'work-map'],
    ['malformed-choices', '{"private-probe-text":', 'choices'],
  ] as const) {
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
    assert.equal(must(readFailure(rejected.stderr).diagnostics[0]).input, role);
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
    readFailure(refused.stderr).diagnostics.some(
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
