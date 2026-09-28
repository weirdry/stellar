import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readRefresh } from '../lib/refresh-reading.ts';
import { refreshState, rememberMap, applyChoices } from '../lib/continuity.ts';
import { refreshFixture } from '../scripts/bench/refresh-fixture.ts';
import { mixedCapture, mixedMap } from './fixtures.ts';
import { must, getDiagnostics } from './support.ts';
import { normalizeCapture } from '../lib/normalize.ts';

function evidence(
  previous: unknown,
  capture: unknown,
  issue: string,
  view = 'focus',
  offset = 0,
) {
  const result = readRefresh(previous, capture, issue, view, offset);
  assert.equal(result.kind, 'refresh-evidence');
  if (result.kind !== 'refresh-evidence') throw new Error('Expected evidence.');
  return result;
}
void test('focused refresh includes pending decisions and changed user evidence without changing authority or facts', () => {
  const { previous, capture } = refreshFixture();
  const before = structuredClone({ previous, capture });
  const index = readRefresh(previous, capture);
  assert.equal(index.kind, 'refresh-index');
  if (index.kind !== 'refresh-index') return;
  assert.deepEqual(
    index.items.map((i) => i.identifier),
    ['SYN-3', 'SYN-4', 'SYN-5', 'SYN-6', 'SYN-7', 'SYN-8'],
  );
  const user = evidence(previous, capture, 'SYN-6');
  assert.equal(user.attention, 'preserved-user-evidence-changed');
  assert.equal(user.reviewReason, null);
  assert.equal(user.previousDecision?.classification?.origin, 'user');
  assert.equal(user.category?.basis, 'Transit calibration and evaluation');
  assert.equal(user.baseline, 'previous-full-observation');
  assert.ok(
    user.items.some((i) => i.text.includes('outside calibration research')),
  );
  const current = refreshState(previous, capture);
  assert.equal(current.changes.review.length, 5);
  assert.equal(
    current.changes.review.some((i) => i.issueId === user.issue.id),
    false,
  );
  assert.deepEqual(current.map.relations, normalizeCapture(capture).relations);
  assert.deepEqual({ previous, capture }, before);
  assert.throws(() =>
    applyChoices(
      current,
      {
        issues: [
          {
            issueId: user.issue.id,
            classification: { category: 'delivery', rationale: 'Overwrite' },
          },
        ],
      },
      'agent',
    ),
  );
  assert.ok(
    evidence(previous, capture, 'SYN-4').items.some((i) =>
      i.text.includes('replace the earlier scope'),
    ),
  );
  assert.ok(
    evidence(previous, capture, 'SYN-5').items.some((i) =>
      i.text.includes('revision=new'),
    ),
  );
  assert.deepEqual(
    readRefresh(previous, capture, '', 'taxonomy').items.length,
    previous.map.categories.length,
  );
});
void test('focus and full views retain exact field slices, explicit omitted ranges and complete continuation', () => {
  const { previous, capture } = refreshFixture();
  const map = normalizeCapture(capture);
  for (const identifier of [
    'SYN-3',
    'SYN-4',
    'SYN-5',
    'SYN-6',
    'SYN-7',
    'SYN-8',
  ]) {
    const current = must(map.issues.find((i) => i.identifier === identifier));
    const prior = previous.map.issues.find((i) => i.identifier === identifier);
    for (const view of ['focus', 'full']) {
      let offset: number | null = 0;
      const reconstructed: Record<string, string> = {};
      do {
        const result = evidence(previous, capture, identifier, view, offset);
        for (const item of result.items) {
          const field = item.field === 'title' ? 'title' : 'description';
          const raw = (item.side === 'before' ? prior : current)?.[field] ?? '';
          assert.equal(
            item.text,
            Array.from(raw).slice(item.start, item.end).join(''),
          );
          assert.ok(Array.from(item.text).length <= 4000);
          const key = item.side + '/' + field;
          reconstructed[key] = (reconstructed[key] ?? '') + item.text;
        }
        offset = result.nextOffset;
      } while (offset !== null);
      if (view === 'full')
        for (const [side, issue] of [
          ['before', prior],
          ['after', current],
        ] as const)
          for (const field of ['title', 'description'] as const)
            assert.equal(
              reconstructed[side + '/' + field] ?? '',
              issue?.[field] ?? '',
            );
    }
  }
  const first = evidence(previous, capture, 'SYN-5');
  assert.ok(JSON.stringify(first.fields).includes('omitted'));
  assert.ok(
    JSON.stringify(first).length <
      JSON.stringify(evidence(previous, capture, 'SYN-5', 'full')).length,
  );
  // Repeated new-issue review still supplies complete available text by default.
  const next = refreshState(previous, capture);
  assert.ok(
    evidence(next, capture, 'SYN-8').items.some((i) =>
      i.text.includes('new instrument'),
    ),
  );
});
void test('pending baselines survive repeated refresh, disappearance, unqueried context and reverted text', () => {
  const original = mixedCapture(),
    previous = rememberMap(mixedMap(original));
  const issue = must(previous.map.issues[0]);
  const changed = structuredClone(original);
  must(changed.records[0]).data.description = 'Changed purpose 🪐\r\n\ud800';
  const pending = refreshState(previous, changed);
  const again = evidence(pending, changed, issue.id);
  assert.equal(again.reviewReason, 'purpose-text-changed');
  assert.ok(
    again.items.some(
      (i) => i.side === 'before' && i.text === issue.description,
    ),
  );
  const absent = structuredClone(changed);
  absent.records = absent.records.filter((r) => r.data.uuid !== issue.nativeId);
  // References may retain context; either route must keep the decision baseline.
  const middle = refreshState(pending, absent);
  const returned = evidence(middle, changed, issue.id);
  assert.equal(returned.reviewReason, 'purpose-text-changed');
  assert.ok(
    returned.items.some(
      (i) => i.side === 'before' && i.text === issue.description,
    ),
  );
  const reverted = evidence(pending, original, issue.id);
  assert.equal(reverted.reviewReason, 'purpose-text-changed');
  assert.equal(reverted.items.length, 0);
  assert.ok(evidence(pending, original, issue.id, 'full').items.length > 0);
});
void test('Unicode chunk edges, missing/null/empty presence, identity collision and malformed views remain safe', () => {
  const capture = mixedCapture(),
    map = mixedMap(capture);
  const issue = must(map.issues[0]);
  const text = 'x'.repeat(3999) + '🪐\r\n' + 'e\u0301\0\ud800'.repeat(21000);
  issue.description = text;
  issue.classification = {
    category: 'transit',
    rationale: 'User choice',
    origin: 'user',
  };
  const previous = rememberMap(map);
  must(capture.records[0]).data.description = text + 'Late change';
  const first = evidence(previous, capture, issue.id, 'full');
  assert.equal(first.items.length, 20);
  assert.notEqual(first.nextOffset, null);
  let at: number | null = 0,
    before = '',
    after = '';
  do {
    const page = evidence(previous, capture, issue.id, 'full', at);
    for (const item of page.items)
      if (item.field === 'description') {
        if (item.side === 'before') before += item.text;
        else after += item.text;
      }
    at = page.nextOffset;
  } while (at !== null);
  assert.equal(before, text);
  assert.equal(after, text + 'Late change');
  for (const old of [null, undefined, ''])
    for (const next of [null, undefined, '']) {
      const initial = mixedMap();
      const i = must(initial.issues[0]);
      i.classification = {
        category: 'transit',
        rationale: 'Pinned',
        origin: 'user',
      };
      if (old === undefined) delete i.description;
      else i.description = old;
      const fresh = mixedCapture();
      if (next === undefined) delete must(fresh.records[0]).data.description;
      else must(fresh.records[0]).data.description = next;
      const state = rememberMap(initial);
      const result = readRefresh(state, fresh);
      if (old !== next) {
        const page = evidence(state, fresh, i.id);
        assert.equal(page.attention, 'preserved-user-evidence-changed');
      } else {
        assert.equal(result.total, 0);
      }
    }
  for (const args of [
    ['#7', 'focus', 0],
    ['private-selector', 'focus', 0],
    [issue.id, 'bad', 0],
    [issue.id, 'focus', -1],
    [issue.id, 'focus', 999999],
  ] as const)
    assert.throws(
      () => readRefresh(previous, capture, args[0], args[1], args[2]),
      (error: unknown) => {
        assert.ok(
          !JSON.stringify(getDiagnostics(error)).includes('private-selector'),
        );
        return true;
      },
    );
});
void test('source and bundled refresh readers preserve files and match from an unrelated cwd', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-refresh-reading-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const { previous, capture } = refreshFixture();
  const input = join(dir, 'state.json'),
    fresh = join(dir, 'capture.json');
  const contents = [JSON.stringify(previous), JSON.stringify(capture)];
  await writeFile(input, must(contents[0]));
  await writeFile(fresh, must(contents[1]));
  for (const entry of ['../bin/stellar.ts', '../bin/stellar.mjs']) {
    const cli = fileURLToPath(new URL(entry, import.meta.url));
    for (const [issue, view] of [
      ['', 'focus'],
      ['', 'taxonomy'],
      ['SYN-6', 'focus'],
      ['SYN-7', 'full'],
      ['SYN-8', 'focus'],
    ]) {
      const result = spawnSync(
        process.execPath,
        [cli, 'read-refresh', input, fresh, must(issue), must(view), '0'],
        { encoding: 'utf8', cwd: dir },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        JSON.parse(result.stdout),
        readRefresh(previous, capture, issue, view),
      );
    }
    const missing = spawnSync(
      process.execPath,
      [cli, 'read-refresh', input, join(dir, 'private-secret')],
      { encoding: 'utf8' },
    );
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, '');
    assert.ok(!missing.stderr.includes('private-secret'));
  }
  assert.equal(await readFile(input, 'utf8'), contents[0]);
  assert.equal(await readFile(fresh, 'utf8'), contents[1]);
});

void test('catalog and taxonomy paginate, identity uncertainty never borrows a visible-number decision', () => {
  const { previous, capture } = refreshFixture();
  const template = must(capture.records.at(-1));
  for (let n = 9; n < 34; n++)
    capture.records.push({
      ...structuredClone(template),
      data: {
        ...template.data,
        id: `SYN-${n}`,
        uuid: `synthetic-new-${n}`,
        url: `https://linear.app/observatory/issue/SYN-${n}`,
      },
    });
  const first = readRefresh(previous, capture),
    next = readRefresh(previous, capture, '', 'focus', 20);
  assert.equal(first.nextOffset, 20);
  assert.equal(first.items.length, 20);
  assert.equal(next.nextOffset, null);
  assert.equal(first.items.length + next.items.length, first.total);
  for (let n = 0; n < 24; n++)
    previous.map.categories.push({
      id: `extra-${n}`,
      domain: 'research',
      label: `Extra ${n}`,
      basis: `Invented inclusion ${n}`,
    });
  assert.equal(readRefresh(previous, capture, '', 'taxonomy').nextOffset, 20);
  const changed = mixedCapture();
  const state = rememberMap(mixedMap(changed));
  must(changed.records[0]).data.uuid = 'different-native-identity';
  const index = readRefresh(state, changed);
  assert.equal(index.kind, 'refresh-index');
  if (index.kind !== 'refresh-index') return;
  const item = must(index.items.find((i) => i.identifier === 'OBS-1'));
  const page = evidence(state, changed, item.id);
  assert.equal(page.reviewReason, 'identity-uncertain');
  assert.equal(page.previousDecision, null);
  assert.equal(page.baseline, 'unavailable');
  assert.ok(page.items.every((i) => i.side === 'after'));
});
void test('unqueried pending context exposes old evidence without presenting it as a current observation', () => {
  const capture = mixedCapture(),
    previous = rememberMap(mixedMap(capture));
  const issue = must(previous.map.issues[3]);
  must(capture.records[3]).data.body = 'Changed actual purpose';
  const pending = refreshState(previous, capture);
  const unknown = structuredClone(capture);
  unknown.records.splice(3, 1);
  const index = readRefresh(pending, unknown);
  assert.equal(index.kind, 'refresh-index');
  if (index.kind !== 'refresh-index') return;
  const item = must(
    index.items.find((i) => i.identity.nativeId === issue.nativeId),
  );
  const result = evidence(pending, unknown, item.id, 'full');
  assert.equal(result.currentEvidence, 'unavailable');
  assert.ok(result.items.every((i) => i.side === 'before'));
  assert.equal(result.reviewReason, 'purpose-text-changed');
  assert.ok(result.items.some((i) => i.text === issue.description));
});

void test('saved null evidence does not manufacture user attention after context or absence', () => {
  for (const route of ['context', 'absent']) {
    const capture = mixedCapture();
    must(capture.records[3]).data.body = null;
    const map = mixedMap(capture),
      issue = must(map.issues[3]);
    let previous = rememberMap(map);
    previous = applyChoices(
      previous,
      {
        issues: [
          {
            issueId: issue.id,
            classification: {
              category: 'delivery',
              rationale: 'Pinned by user',
            },
          },
        ],
      },
      'user',
    );
    const intermediate = structuredClone(capture);
    intermediate.records.splice(3, 1);
    if (route === 'absent')
      intermediate.records = intermediate.records.filter(
        (r) => r.sourceId === 'linear-observatory',
      );
    const middle = refreshState(previous, intermediate);
    assert.equal(
      middle.map.issues.find((i) => i.nativeId === issue.nativeId)?.detail,
      route === 'context' ? 'unqueried' : undefined,
    );
    const inputs = structuredClone({ middle, capture });
    assert.equal(readRefresh(middle, capture).total, 0);
    // Actual body text must still surface, including empty string versus null.
    for (const body of ['', 'Changed purpose']) {
      const changed = structuredClone(capture);
      must(changed.records[3]).data.body = body;
      const result = evidence(middle, changed, issue.id);
      assert.equal(result.attention, 'preserved-user-evidence-changed');
      assert.equal(
        must(result.fields.find((f) => f.field === 'description')).changed,
        true,
      );
    }
    assert.deepEqual({ middle, capture }, inputs);
  }
  // The same comparison must not invent a body change during a title review.
  const capture = mixedCapture();
  must(capture.records[3]).data.body = null;
  const previous = rememberMap(mixedMap(capture)),
    issue = must(previous.map.issues[3]);
  must(capture.records[3]).data.title = 'A different title';
  const result = evidence(previous, capture, issue.id);
  const body = must(result.fields.find((f) => f.field === 'description'));
  assert.equal(body.changed, false);
  assert.equal(body.before.presence, 'omitted');
  assert.equal(body.after.presence, 'null');
});

void test('unavailable comparisons and unclassified baselines do not assert a change or a decision', () => {
  const capture = mixedCapture(),
    previous = rememberMap(mixedMap(capture));
  const issue = must(previous.map.issues[3]);
  const unknown = structuredClone(capture);
  unknown.records.splice(3, 1);
  const context = rememberMap(mixedMap(unknown));
  const contextIssue = must(
    context.map.issues.find((i) => i.nativeId === issue.nativeId),
  );
  const user = applyChoices(
    context,
    {
      issues: [
        {
          issueId: contextIssue.id,
          classification: {
            category: 'delivery',
            rationale: 'User chose while unqueried',
          },
        },
      ],
    },
    'user',
  );
  const first = evidence(user, capture, issue.id);
  assert.equal(first.attention, 'preserved-user-evidence-available');
  assert.equal(first.baseline, 'unavailable');
  assert.ok(first.fields.every((f) => f.changed === null));
  assert.ok(first.items.length > 0);
  assert.ok(first.items.every((i) => i.side === 'after'));
  assert.equal(first.previousDecision?.classification?.origin, 'user');
  assert.equal(readRefresh(user, unknown).total, 0);
  assert.equal(readRefresh(refreshState(user, capture), capture).total, 0);

  must(capture.records[3]).data.body = 'Changed actual purpose';
  const pending = refreshState(previous, capture);
  const index = readRefresh(pending, unknown);
  assert.equal(index.kind, 'refresh-index');
  if (index.kind !== 'refresh-index') return;
  const item = must(
    index.items.find((i) => i.identity.nativeId === issue.nativeId),
  );
  const unavailable = evidence(pending, unknown, item.id);
  assert.equal(unavailable.reviewReason, 'purpose-text-changed');
  assert.ok(unavailable.fields.every((f) => f.changed === null));
  assert.ok(unavailable.items.length > 0);
  assert.ok(unavailable.items.every((i) => i.side === 'before'));

  const fresh = refreshFixture();
  const added = evidence(fresh.previous, fresh.capture, 'SYN-8');
  assert.ok(added.fields.every((f) => f.changed === null));
  const repeated = evidence(
    refreshState(fresh.previous, fresh.capture),
    fresh.capture,
    'SYN-8',
  );
  assert.equal(repeated.baseline, 'saved-observation');
  assert.equal(repeated.previousDecision?.classification, null);
  assert.equal(repeated.reviewReason, 'new-issue');
  assert.ok(repeated.fields.every((f) => f.changed === false));
  assert.ok(repeated.items.some((i) => i.side === 'before'));
  assert.ok(repeated.items.some((i) => i.side === 'after'));
});
