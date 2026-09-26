import { assertWorkMap } from '../lib/validate.ts';
import { objectJSON } from './support.ts';
import { failure as readFailure } from './support.ts';
import type { State } from '../lib/contracts.ts';
import { must } from './support.ts';
import { getDiagnostics } from './support.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  symlink,
  stat,
  mkdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  rememberMap,
  refreshState,
  applyChoices,
  assertState,
} from '../lib/continuity.ts';
import { normalizeCapture } from '../lib/normalize.ts';
import { validateWorkMap } from '../lib/validate.ts';
import { renderWorkMap } from '../lib/render.ts';
import { mixedCapture, mixedMap } from './fixtures.ts';
import type { StellarWorkMap } from '../types/generated/state.js';

const initial = () => rememberMap(mixedMap());
const pin = (state: State, index = 0) =>
  applyChoices(
    state,
    {
      issues: [
        {
          issueId: must(state.map.issues[index]).id,
          classification: {
            category: 'delivery',
            rationale: 'Explicit user placement',
          },
          targets: ['Chosen target'],
        },
      ],
    },
    'user',
  );
const facts = (map: StellarWorkMap) => {
  const result = structuredClone(map);
  result.domains = [];
  result.categories = [];
  for (const issue of result.issues) {
    delete issue.classification;
    delete issue.classificationEvidence;
    issue.targets = [];
  }
  return result;
};
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

void test('saved user decisions coexist with current facts, new issues and agent review on refresh', async () => {
  const previous = pin(initial()),
    before = structuredClone(previous),
    capture = mixedCapture();
  must(capture.records[0]).data['statusType'] = 'completed';
  must(capture.records[0]).data['status'] = 'Done';
  must(capture.records[0]).data.description =
    'A changed objective chosen by the user.';
  must(capture.records[1]).data.description = 'A new experimental objective.';
  capture.records.push({
    ...must(structuredClone(capture.records[2])),
    data: {
      ...must(capture.records[2]).data,
      node_id: 'I_invented_new',
      number: 88,
      title: 'Build an invented spectrometer tool',
      html_url: 'https://github.com/example/control/issues/88',
    },
  });
  const next = refreshState(previous, capture);
  assert.deepEqual(previous, before);
  assert.deepEqual(facts(next.map), normalizeCapture(capture));
  assert.deepEqual(
    must(next.map.issues[0]).classification,
    must(previous.map.issues[0]).classification,
  );
  assert.deepEqual(must(next.map.issues[0]).targets, ['Chosen target']);
  assert.equal(must(next.map.issues[0]).status.type, 'completed');
  assert.equal(must(next.map.issues[1]).classification, undefined);
  assert.equal(next.changes.added.length, 1);
  assert.deepEqual(
    next.changes.review.map((r) => r.reason),
    ['purpose-text-changed', 'new-issue'],
  );
  await assert.rejects(renderWorkMap(next.map));
  const final = applyChoices(
    next,
    {
      issues: [
        {
          issueId: must(next.map.issues[1]).id,
          classification: {
            category: 'transit',
            rationale: 'Reconsidered experiment',
          },
        },
        {
          issueId: must(next.map.issues[5]).id,
          classification: {
            category: 'control',
            rationale: 'New tool capability',
          },
        },
      ],
    },
    'agent',
  );
  assert.equal(validateWorkMap(final.map).valid, true);
  assert.equal(final.changes.review.length, 0);
  assert.deepEqual(refreshState(final, capture).map, final.map);
  const html = await renderWorkMap(final.map);
  assert.ok(!html.includes('"memory":'));
});

void test('partial and omitted sources retain absent decisions without restoring stale issues or relations', async () => {
  const previous = pin(initial(), 2),
    capture = mixedCapture();
  must(capture.sources[1]).coverage.issues = 'partial';
  capture.records.splice(2, 1);
  const next = refreshState(previous, capture);
  assert.equal(next.map.issues.length, 4);
  assert.equal(next.memory.length, 5);
  assert.equal(next.changes.notObserved.length, 1);
  assert.deepEqual(facts(next.map), normalizeCapture(capture));
  assert.ok(
    !next.map.issues.some((i) => i.id === must(previous.map.issues[2]).id),
  );
  assert.ok(
    !(await renderWorkMap(next.map)).includes(
      must(previous.map.issues[2]).title,
    ),
  );
  const omitted = structuredClone(capture);
  omitted.sources.splice(1, 1);
  const twice = refreshState(next, omitted);
  assert.equal(twice.changes.notObserved.length, 1);
  const returned = refreshState(twice, mixedCapture());
  assert.deepEqual(
    must(returned.map.issues[2]).classification,
    must(previous.map.issues[2]).classification,
  );
  assert.deepEqual(must(returned.map.issues[2]).targets, ['Chosen target']);
  assert.deepEqual(returned.changes.returned, [
    must(returned.map.issues[2]).id,
  ]);
});

void test('refresh uses provider namespace and native identity, independent of local keys and visible numbers', () => {
  const previous = pin(initial(), 2),
    capture = mixedCapture();
  for (const source of capture.sources) {
    const old = source.id;
    source.id += '-new-local-key';
    for (const record of capture.records)
      if (record.sourceId === old) record.sourceId = source.id;
  }
  const next = refreshState(previous, capture);
  assert.deepEqual(
    must(next.map.issues[2]).classification,
    must(previous.map.issues[2]).classification,
  );
  assert.notEqual(must(next.map.issues[2]).id, must(previous.map.issues[2]).id);
  assert.equal(next.changes.added.length, 0);
  assert.notDeepEqual(
    must(next.map.issues[3]).classification,
    must(next.map.issues[2]).classification,
  );
  const uncertain = mixedCapture();
  must(uncertain.records[2]).data.node_id = 'I_different_native_id';
  const distinct = refreshState(previous, uncertain);
  assert.equal(must(distinct.map.issues[2]).classification, undefined);
  assert.ok(
    distinct.changes.review.some((r) => r.reason === 'identity-uncertain'),
  );
  assert.equal(distinct.memory.length, 6);
  assert.equal(distinct.changes.notObserved.length, 1);
});

void test('agent choices cannot overwrite user fields or redefine remembered taxonomy', () => {
  const saved = pin(initial()),
    id = must(saved.map.issues[0]).id,
    before = structuredClone(saved);
  rejectAt(
    () =>
      applyChoices(
        saved,
        {
          issues: [
            {
              issueId: id,
              classification: {
                category: 'transit',
                rationale: 'private-probe-text',
              },
            },
          ],
        },
        'agent',
      ),
    '/issues/0/classification',
  );
  rejectAt(
    () =>
      applyChoices(saved, { issues: [{ issueId: id, targets: [] }] }, 'agent'),
    '/issues/0/targets',
  );
  rejectAt(
    () =>
      applyChoices(
        saved,
        {
          categories: [
            { ...must(saved.map.categories[2]), label: 'private-probe-text' },
          ],
        },
        'agent',
      ),
    '/categories/0',
  );
  const unchanged = applyChoices(
    saved,
    {
      issues: [
        {
          issueId: id,
          classification: {
            category: 'delivery',
            rationale: 'Explicit user placement',
          },
          targets: ['Chosen target'],
        },
      ],
    },
    'agent',
  );
  assert.deepEqual(unchanged.memory, saved.memory);
  const revised = applyChoices(
    saved,
    {
      categories: [
        { ...must(saved.map.categories[2]), label: 'User-renamed group' },
      ],
      issues: [{ issueId: id, targets: [] }],
    },
    'user',
  );
  assert.deepEqual(
    must(revised.map.issues[0]).classification,
    must(saved.map.issues[0]).classification,
  );
  assert.deepEqual(must(revised.memory[0]).targets, []);
  assert.equal(must(revised.memory[0]).targetsOrigin, 'user');
  assert.deepEqual(saved, before);
});

void test('user target ownership is independent from agent classification and survives a later regrouping', () => {
  const state = initial(),
    id = must(state.map.issues[0]).id;
  const revised = applyChoices(
    state,
    { issues: [{ issueId: id, targets: [] }] },
    'user',
  );
  assert.equal(must(must(revised.memory[0]).classification).origin, 'agent');
  const classified = applyChoices(
    revised,
    {
      issues: [
        {
          issueId: id,
          classification: {
            category: 'control',
            rationale: 'Reconsidered purpose',
          },
        },
      ],
    },
    'agent',
  );
  const refreshed = refreshState(classified, mixedCapture());
  assert.equal(
    must(must(refreshed.map.issues[0]).classification).origin,
    'agent',
  );
  assert.equal(
    must(must(refreshed.map.issues[0]).classification).category,
    'control',
  );
  assert.deepEqual(must(refreshed.map.issues[0]).targets, []);
  assert.equal(must(refreshed.memory[0]).targetsOrigin, 'user');
  rejectAt(
    () =>
      applyChoices(
        refreshed,
        { issues: [{ issueId: id, targets: ['An automatic suggestion'] }] },
        'agent',
      ),
    '/issues/0/targets',
  );
});

void test('pending purpose review survives repeated refresh and temporary absence; unqueried detail stays unknown', () => {
  const saved = initial(),
    changed = mixedCapture();
  must(changed.records[2]).data.description = undefined;
  must(changed.records[2]).data.body = 'Changed control purpose';
  const next = refreshState(saved, changed);
  assert.equal(must(next.map.issues[2]).classification, undefined);
  assert.equal(
    must(refreshState(next, changed).map.issues[2]).classification,
    undefined,
  );
  const absent = structuredClone(changed);
  absent.records.splice(2, 1);
  const missing = refreshState(next, absent);
  const returned = refreshState(missing, changed);
  assert.equal(must(returned.map.issues[2]).classification, undefined);
  const context = mixedCapture();
  context.records.splice(3, 1);
  const unknown = refreshState(pin(saved, 3), context).map.issues.find(
    (i) => i.nativeId === must(saved.map.issues[3]).nativeId,
  );
  assert.equal(must(unknown).detail, 'unqueried');
  assert.equal(must(unknown).status.type, 'unknown');
  assert.equal(must(unknown).scope, 'context');
  assert.equal(must(must(unknown).classification).origin, 'user');
});

void test('pending review survives context, absence, local key changes and reverted text until explicitly classified', () => {
  const saved = initial(),
    nativeId = must(saved.map.issues[3]).nativeId,
    changed = mixedCapture();
  const issue = (state: State) =>
    state.map.issues.find((i: { nativeId: string }) => i.nativeId === nativeId);
  const memory = (state: State) =>
    state.memory.find((i: { nativeId: string }) => i.nativeId === nativeId);
  must(changed.records[3]).data.body =
    'A different invented research objective.';
  const pending = refreshState(saved, changed);
  const unqueried = structuredClone(changed);
  unqueried.records.splice(3, 1);
  let state = refreshState(refreshState(pending, unqueried), unqueried);
  assert.equal(must(issue(state)).detail, 'unqueried');
  assert.equal(must(issue(state)).classification, undefined);
  assert.deepEqual(state.changes.review, [
    {
      issueId: must(issue(state)).id,
      reason: 'purpose-text-changed',
    },
  ]);
  const absent = structuredClone(unqueried);
  must(must(absent.records[2]).links).blockedBy = [];
  state = refreshState(state, absent);
  assert.equal(issue(state), undefined);
  assert.equal(must(memory(state)).reviewReason, 'purpose-text-changed');
  assert.deepEqual(state.changes.review, []);
  const reverted = mixedCapture();
  must(reverted.sources[2]).id = 'delivery-new-key';
  for (const record of reverted.records)
    if (record.sourceId === 'github-delivery')
      record.sourceId = 'delivery-new-key';
  state = refreshState(state, reverted);
  assert.notEqual(must(issue(state)).id, must(saved.map.issues[3]).id);
  assert.equal(must(issue(state)).classification, undefined);
  assert.equal(must(state.changes.review[0]).issueId, must(issue(state)).id);
  const invalid = structuredClone(state);
  invalid.changes.review = [];
  rejectAt(() => assertState(invalid), '/changes/review');
  invalid.changes.review = structuredClone(state.changes.review);
  must(invalid.map.issues.find((i) => i.nativeId === nativeId)).classification =
    structuredClone(must(must(saved.map.issues[3]).classification));
  rejectAt(() => assertState(invalid), '/map/issues/3/classification');
  state = applyChoices(
    state,
    {
      issues: [{ issueId: must(issue(state)).id, targets: ['User target'] }],
    },
    'user',
  );
  assert.equal(must(memory(state)).reviewReason, 'purpose-text-changed');
  state = applyChoices(
    state,
    {
      issues: [
        {
          issueId: must(issue(state)).id,
          classification: {
            category: 'delivery',
            rationale: 'Explicitly reconsidered current work',
          },
        },
      ],
    },
    'agent',
  );
  assert.equal(must(memory(state)).reviewReason, undefined);
  assert.deepEqual(state.changes.review, []);
  state = refreshState(state, reverted);
  assert.equal(must(must(issue(state)).classification).category, 'delivery');
  assert.deepEqual(must(issue(state)).targets, ['User target']);
});

void test('identity uncertainty keeps its reason through refresh and absence until a classification resolves it', () => {
  const saved = pin(initial(), 2),
    capture = mixedCapture();
  must(capture.records[2]).data.node_id = 'I_new_identity';
  let state = refreshState(saved, capture);
  const id = must(state.map.issues[2]).id;
  const pending = (value: State) =>
    assert.deepEqual(value.changes.review, [
      {
        issueId: id,
        reason: 'identity-uncertain',
      },
    ]);
  pending(state);
  must(capture.records[2]).data.body =
    'Changed again before the identity review.';
  state = refreshState(state, capture);
  pending(state);
  const absent = structuredClone(capture);
  absent.records.splice(2, 1);
  state = refreshState(state, absent);
  assert.equal(
    must(state.memory.find((i) => i.nativeId === 'I_new_identity'))
      .reviewReason,
    'identity-uncertain',
  );
  must(capture.records[2]).scope = 'context';
  state = refreshState(state, capture);
  pending(state);
  must(capture.records[2]).scope = 'assigned';
  state = refreshState(state, capture);
  pending(state);
  state = applyChoices(
    state,
    { issues: [{ issueId: id, targets: [] }] },
    'agent',
  );
  pending(state);
  state = applyChoices(
    state,
    {
      issues: [
        {
          issueId: id,
          classification: {
            category: 'control',
            rationale: 'Reviewed as a distinct identity',
          },
        },
      ],
    },
    'user',
  );
  assert.deepEqual(state.changes.review, []);
  assert.equal(
    must(state.memory.find((i) => i.nativeId === 'I_new_identity'))
      .reviewReason,
    undefined,
  );
  assert.deepEqual(refreshState(state, capture).changes.review, []);
  assert.deepEqual(
    state.memory.find((i) => i.nativeId === must(saved.map.issues[2]).nativeId),
    saved.memory[2],
  );
});

void test('continuity refuses relative references before writing and carries web references through every command', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-reference-review-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const map = mixedMap();
  map.attachments = [
    {
      title: 'Context',
      note: 'Authored document',
      href: 'notes/private-probe-text.html',
    },
  ];
  await mkdir(join(dir, 'notes'));
  const notePath = join(dir, must(map.attachments[0]).href);
  const note = '<!doctype html><title>Invented reference</title>';
  await writeFile(notePath, note);
  const input = join(dir, 'map.json'),
    capture = join(dir, 'capture.json'),
    choices = join(dir, 'choices.json');
  const bytes = JSON.stringify(map);
  await writeFile(input, bytes);
  await writeFile(capture, JSON.stringify(mixedCapture()));
  await writeFile(
    choices,
    JSON.stringify({
      issues: [{ issueId: must(map.issues[0]).id, targets: [] }],
    }),
  );
  assert.equal(run('render', input, join(dir, 'original.html')).status, 0);
  const originalHTML = await readFile(join(dir, 'original.html'));
  const reject = async (args: string[], output: string, path: string) => {
    const result = run(...args, output);
    assert.equal(result.status, 1, result.stdout);
    const diagnostic = readFailure(result.stderr).diagnostics[0];
    assert.equal(must(diagnostic).path, path);
    assert.ok(must(diagnostic).fix.includes('HTTP(S)'));
    assert.ok(!result.stderr.includes('private-probe-text'));
    await assert.rejects(stat(output), { code: 'ENOENT' });
  };
  await reject(
    ['remember', input],
    join(dir, 'refused-remember'),
    '/attachments/0/href',
  );
  const supplied = initial();
  supplied.map.attachments = structuredClone(map.attachments);
  const statePath = join(dir, 'supplied-state.json');
  const stateBytes = JSON.stringify(supplied);
  await writeFile(statePath, stateBytes);
  for (const command of ['refresh', 'classify', 'revise'])
    await reject(
      [command, statePath, command === 'refresh' ? capture : choices],
      join(dir, 'refused-' + command),
      '/map/attachments/0/href',
    );
  assert.equal(await readFile(input, 'utf8'), bytes);
  assert.equal(await readFile(statePath, 'utf8'), stateBytes);
  assert.equal(await readFile(notePath, 'utf8'), note);
  assert.deepEqual(await readFile(join(dir, 'original.html')), originalHTML);
  const web = mixedMap();
  web.attachments = [
    {
      title: 'Web context',
      note: 'Authored document',
      href: 'https://example.com/context.html',
    },
  ];
  const webPath = join(dir, 'web.json');
  await writeFile(webPath, JSON.stringify(web));
  let last = join(dir, 'remembered');
  assert.equal(run('remember', webPath, last).status, 0);
  for (const command of ['refresh', 'classify', 'revise']) {
    const next = join(dir, command);
    const result = run(
      command,
      join(last, 'state.json'),
      command === 'refresh' ? capture : choices,
      next,
    );
    assert.equal(result.status, 0, result.stderr);
    const current = assertWorkMap(
      JSON.parse(await readFile(join(next, 'work-map.json'), 'utf8')),
    );
    assert.deepEqual(current.attachments, web.attachments);
    last = next;
  }
  assert.equal(
    run('render', join(last, 'work-map.json'), join(last, 'stellar.html'))
      .status,
    0,
  );
});

void test('state and choice validation reject contradictions with repair paths before writing', () => {
  const state = pin(initial());
  const duplicate = structuredClone(state);
  duplicate.memory.push(must(duplicate.memory[0]));
  rejectAt(() => assertState(duplicate), '/memory/5');
  const missing = structuredClone(state);
  delete must(missing.map.issues[0]).classification;
  rejectAt(() => assertState(missing), '/map/issues/0/classification');
  const category = structuredClone(state);
  must(category.memory[4]).classification = {
    category: 'absent',
    origin: 'user',
    rationale: 'private-probe-text',
  };
  rejectAt(() => assertState(category), '/memory/4/classification/category');
  const owner = mixedCapture();
  owner.owner = 'Different owner';
  rejectAt(() => refreshState(state, owner), '/owner');
  rejectAt(
    () =>
      applyChoices(
        state,
        { issues: [{ issueId: 'missing', targets: [] }] },
        'user',
      ),
    '/issues/0/issueId',
  );
  rejectAt(
    () =>
      applyChoices(
        state,
        {
          issues: [
            {
              issueId: must(state.map.issues[0]).id,
              classification: {
                category: 'missing',
                rationale: 'private-probe-text',
              },
            },
          ],
        },
        'user',
      ),
    '/issues/0/classification/category',
  );
  rejectAt(
    () =>
      applyChoices(
        state,
        {
          categories: [
            { id: 'new', label: 'New', domain: 'missing', basis: 'New' },
          ],
        },
        'user',
      ),
    '/categories/0/domain',
  );
  assert.throws(() =>
    applyChoices(
      state,
      {
        issues: [
          { issueId: must(state.map.issues[0]).id, status: 'completed' },
        ],
      },
      'agent',
    ),
  );
});

void test('CLI remembers, revises, refreshes and classifies a new run while preserving all earlier artifacts', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-continuity-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
  const run = (...args: string[]) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const write = async (name: string, data: unknown) => {
    const path = join(dir, name);
    await writeFile(path, JSON.stringify(data));
    return path;
  };
  const map = mixedMap(),
    mapPath = await write('original.json', map),
    capturePath = await write('capture.json', mixedCapture());
  const saved = join(dir, 'saved');
  assert.equal(run('remember', mapPath, saved).status, 0);
  const savedPath = join(saved, 'state.json'),
    savedBytes = await readFile(savedPath, 'utf8');
  assert.equal((await stat(savedPath)).mode & 0o777, 0o600);
  const choices = await write('choices.json', {
    issues: [
      {
        issueId: must(map.issues[0]).id,
        classification: { category: 'delivery', rationale: 'User choice' },
        targets: [],
      },
    ],
  });
  const edited = join(dir, 'edited');
  assert.equal(run('revise', savedPath, choices, edited).status, 0);
  const refreshed = join(dir, 'refreshed');
  const result = run(
    'refresh',
    join(edited, 'state.json'),
    capturePath,
    refreshed,
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(objectJSON(result.stdout)['needsClassification'], 0);
  const refreshedMap = join(refreshed, 'work-map.json');
  const refreshedBytes = await readFile(refreshedMap, 'utf8');
  assert.equal(
    must(
      must(assertWorkMap(JSON.parse(refreshedBytes)).issues[0]).classification,
    ).origin,
    'user',
  );
  assert.equal(
    run('render', refreshedMap, join(refreshed, 'stellar.html')).status,
    0,
  );
  assert.equal(run('refresh', savedPath, capturePath, refreshed).status, 1);
  const alias = join(dir, 'alias');
  await symlink(saved, alias);
  assert.equal(run('remember', mapPath, alias).status, 1);
  assert.equal(run('remember', mapPath, mapPath).status, 1);
  const conflict = await write('conflict.json', {
    issues: [
      {
        issueId: must(map.issues[0]).id,
        classification: {
          category: 'transit',
          rationale: 'private-probe-text',
        },
      },
    ],
  });
  const failed = join(dir, 'failed');
  const rejected = run(
    'classify',
    join(edited, 'state.json'),
    conflict,
    failed,
  );
  assert.equal(rejected.status, 1);
  assert.equal(
    must(readFailure(rejected.stderr).diagnostics[0]).path,
    '/issues/0/classification',
  );
  assert.ok(!rejected.stderr.includes('private-probe-text'));
  await assert.rejects(stat(failed), { code: 'ENOENT' });
  assert.equal(await readFile(savedPath, 'utf8'), savedBytes);
  assert.equal(await readFile(refreshedMap, 'utf8'), refreshedBytes);
  assert.deepEqual(JSON.parse(await readFile(mapPath, 'utf8')), map);
});
