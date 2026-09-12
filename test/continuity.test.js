import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  symlink,
  stat,
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
} from '../lib/continuity.js';
import { normalizeCapture } from '../lib/normalize.js';
import { validateWorkMap } from '../lib/validate.js';
import { renderWorkMap } from '../lib/render.js';
import { mixedCapture, mixedMap } from './fixtures.js';

const initial = () => rememberMap(mixedMap());
const pin = (state, index = 0) =>
  applyChoices(
    state,
    {
      issues: [
        {
          issueId: state.map.issues[index].id,
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
const facts = (map) => {
  const result = structuredClone(map);
  result.domains = [];
  result.categories = [];
  for (const issue of result.issues) {
    delete issue.classification;
    issue.targets = [];
  }
  return result;
};
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

test('saved user decisions coexist with current facts, new issues and agent review on refresh', async () => {
  const previous = pin(initial()),
    before = structuredClone(previous),
    capture = mixedCapture();
  capture.records[0].data.statusType = 'completed';
  capture.records[0].data.status = 'Done';
  capture.records[0].data.description =
    'A changed objective chosen by the user.';
  capture.records[1].data.description = 'A new experimental objective.';
  capture.records.push({
    ...structuredClone(capture.records[2]),
    data: {
      ...capture.records[2].data,
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
    next.map.issues[0].classification,
    previous.map.issues[0].classification,
  );
  assert.deepEqual(next.map.issues[0].targets, ['Chosen target']);
  assert.equal(next.map.issues[0].status.type, 'completed');
  assert.equal(next.map.issues[1].classification, undefined);
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
          issueId: next.map.issues[1].id,
          classification: {
            category: 'transit',
            rationale: 'Reconsidered experiment',
          },
        },
        {
          issueId: next.map.issues[5].id,
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

test('partial and omitted sources retain absent decisions without restoring stale issues or relations', async () => {
  const previous = pin(initial(), 2),
    capture = mixedCapture();
  capture.sources[1].coverage.issues = 'partial';
  capture.records.splice(2, 1);
  const next = refreshState(previous, capture);
  assert.equal(next.map.issues.length, 4);
  assert.equal(next.memory.length, 5);
  assert.equal(next.changes.notObserved.length, 1);
  assert.deepEqual(facts(next.map), normalizeCapture(capture));
  assert.ok(!next.map.issues.some((i) => i.id === previous.map.issues[2].id));
  assert.ok(
    !(await renderWorkMap(next.map)).includes(previous.map.issues[2].title),
  );
  const omitted = structuredClone(capture);
  omitted.sources.splice(1, 1);
  const twice = refreshState(next, omitted);
  assert.equal(twice.changes.notObserved.length, 1);
  const returned = refreshState(twice, mixedCapture());
  assert.deepEqual(
    returned.map.issues[2].classification,
    previous.map.issues[2].classification,
  );
  assert.deepEqual(returned.map.issues[2].targets, ['Chosen target']);
  assert.deepEqual(returned.changes.returned, [returned.map.issues[2].id]);
});

test('refresh uses provider namespace and native identity, independent of local keys and visible numbers', () => {
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
    next.map.issues[2].classification,
    previous.map.issues[2].classification,
  );
  assert.notEqual(next.map.issues[2].id, previous.map.issues[2].id);
  assert.equal(next.changes.added.length, 0);
  assert.notDeepEqual(
    next.map.issues[3].classification,
    next.map.issues[2].classification,
  );
  const uncertain = mixedCapture();
  uncertain.records[2].data.node_id = 'I_different_native_id';
  const distinct = refreshState(previous, uncertain);
  assert.equal(distinct.map.issues[2].classification, undefined);
  assert.ok(
    distinct.changes.review.some((r) => r.reason === 'identity-uncertain'),
  );
  assert.equal(distinct.memory.length, 6);
  assert.equal(distinct.changes.notObserved.length, 1);
});

test('agent choices cannot overwrite user fields or redefine remembered taxonomy', () => {
  const saved = pin(initial()),
    id = saved.map.issues[0].id,
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
            { ...saved.map.categories[2], label: 'private-probe-text' },
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
      categories: [{ ...saved.map.categories[2], label: 'User-renamed group' }],
      issues: [{ issueId: id, targets: [] }],
    },
    'user',
  );
  assert.deepEqual(
    revised.map.issues[0].classification,
    saved.map.issues[0].classification,
  );
  assert.deepEqual(revised.memory[0].targets, []);
  assert.equal(revised.memory[0].targetsOrigin, 'user');
  assert.deepEqual(saved, before);
});

test('user target ownership is independent from agent classification and survives a later regrouping', () => {
  const state = initial(),
    id = state.map.issues[0].id;
  const revised = applyChoices(
    state,
    { issues: [{ issueId: id, targets: [] }] },
    'user',
  );
  assert.equal(revised.memory[0].classification.origin, 'agent');
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
  assert.equal(refreshed.map.issues[0].classification.origin, 'agent');
  assert.equal(refreshed.map.issues[0].classification.category, 'control');
  assert.deepEqual(refreshed.map.issues[0].targets, []);
  assert.equal(refreshed.memory[0].targetsOrigin, 'user');
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

test('pending purpose review survives repeated refresh and temporary absence; unqueried detail stays unknown', () => {
  const saved = initial(),
    changed = mixedCapture();
  changed.records[2].data.description = undefined;
  changed.records[2].data.body = 'Changed control purpose';
  const next = refreshState(saved, changed);
  assert.equal(next.map.issues[2].classification, undefined);
  assert.equal(
    refreshState(next, changed).map.issues[2].classification,
    undefined,
  );
  const absent = structuredClone(changed);
  absent.records.splice(2, 1);
  const missing = refreshState(next, absent);
  const returned = refreshState(missing, changed);
  assert.equal(returned.map.issues[2].classification, undefined);
  const context = mixedCapture();
  context.records.splice(3, 1);
  const unknown = refreshState(pin(saved, 3), context).map.issues.find(
    (i) => i.nativeId === saved.map.issues[3].nativeId,
  );
  assert.equal(unknown.detail, 'unqueried');
  assert.equal(unknown.status.type, 'unknown');
  assert.equal(unknown.scope, 'context');
  assert.equal(unknown.classification.origin, 'user');
});

test('state and choice validation reject contradictions with repair paths before writing', () => {
  const state = pin(initial());
  const duplicate = structuredClone(state);
  duplicate.memory.push(duplicate.memory[0]);
  rejectAt(() => assertState(duplicate), '/memory/5');
  const missing = structuredClone(state);
  delete missing.map.issues[0].classification;
  rejectAt(() => assertState(missing), '/map/issues/0/classification');
  const category = structuredClone(state);
  category.memory[4].classification = {
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
              issueId: state.map.issues[0].id,
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
      { issues: [{ issueId: state.map.issues[0].id, status: 'completed' }] },
      'agent',
    ),
  );
});

test('CLI remembers, revises, refreshes and classifies a new run while preserving all earlier artifacts', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-continuity-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  const write = async (name, data) => {
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
        issueId: map.issues[0].id,
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
  assert.equal(JSON.parse(result.stdout).needsClassification, 0);
  const refreshedMap = join(refreshed, 'work-map.json');
  const refreshedBytes = await readFile(refreshedMap, 'utf8');
  assert.equal(
    JSON.parse(refreshedBytes).issues[0].classification.origin,
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
        issueId: map.issues[0].id,
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
    JSON.parse(rejected.stderr).diagnostics[0].path,
    '/issues/0/classification',
  );
  assert.ok(!rejected.stderr.includes('private-probe-text'));
  await assert.rejects(stat(failed), { code: 'ENOENT' });
  assert.equal(await readFile(savedPath, 'utf8'), savedBytes);
  assert.equal(await readFile(refreshedMap, 'utf8'), refreshedBytes);
  assert.deepEqual(JSON.parse(await readFile(mapPath, 'utf8')), map);
});
