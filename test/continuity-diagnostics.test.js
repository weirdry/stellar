import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  writeFile,
  readFile,
  mkdir,
  rm,
  symlink,
  lstat,
  chmod,
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
import { validateWorkMap } from '../lib/validate.js';
import { mixedCapture, mixedMap } from './fixtures.js';

const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const diagnostics = (result) => {
  assert.equal(result.status, 1, result.stderr);
  assert.ok(!result.stderr.includes('private-probe-text'));
  const failure = JSON.parse(result.stderr);
  assert.equal(failure.valid, false);
  assert.ok(failure.diagnostics.every((d) => d.path && d.fix));
  return failure.diagnostics;
};
const thrown = (fn) => {
  let result;
  assert.throws(fn, (error) => {
    result = error.diagnostics;
    return !!result;
  });
  return result;
};

// CLI inputs are intentionally named alike: the argument role must identify
// the repair without parsing paths or echoing JSON parser excerpts.
test('JSON syntax diagnostics identify state, capture, choices and work-map inputs without writing', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-input-diagnostics-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const first = join(dir, 'one.json'),
    second = join(dir, 'two.json');
  const state = rememberMap(mixedMap());
  const bad = '{"private-probe-text":';
  for (const command of ['refresh', 'classify', 'revise']) {
    const next =
      command === 'refresh'
        ? mixedCapture()
        : { issues: [{ issueId: state.map.issues[0].id, targets: [] }] };
    for (const role of [
      'state',
      command === 'refresh' ? 'capture' : 'choices',
    ]) {
      await writeFile(first, role === 'state' ? bad : JSON.stringify(state));
      await writeFile(second, role === 'state' ? JSON.stringify(next) : bad);
      const output = join(dir, command + '-' + role);
      const errors = diagnostics(run(command, first, second, output));
      assert.equal(errors[0].input, role);
      assert.equal(errors[0].code, 'input-json');
      assert.equal(errors[0].path, '/');
      await assert.rejects(lstat(output), { code: 'ENOENT' });
      assert.equal(
        await readFile(role === 'state' ? first : second, 'utf8'),
        bad,
      );
    }
  }
  await writeFile(first, bad);
  for (const command of ['remember', 'render', 'normalize']) {
    const output = join(dir, command);
    const errors = diagnostics(run(command, first, output));
    assert.equal(
      errors[0].input,
      command === 'normalize' ? 'capture' : 'work-map',
    );
    await assert.rejects(lstat(output), { code: 'ENOENT' });
  }
});

test('continuity schema diagnostics point to extra fields and explain alternatives without bogus required fields', () => {
  const state = rememberMap(mixedMap());
  const typo = thrown(() => applyChoices(state, { issue: [] }, 'agent'));
  assert.ok(typo.some((d) => d.path === '/issue'));
  assert.ok(
    typo.some((d) => d.path === '/' && /at least one nonempty/.test(d.message)),
  );
  assert.ok(
    typo.every(
      (d) => d.input === 'choices' && !/required property/.test(d.message),
    ),
  );
  const escaped = thrown(() => applyChoices(state, { 'issue/~': [] }, 'user'));
  assert.ok(escaped.some((d) => d.path === '/issue~1~0'));
  const item = thrown(() =>
    applyChoices(
      state,
      { issues: [{ issueId: state.map.issues[0].id }] },
      'user',
    ),
  );
  assert.ok(
    item.some(
      (d) =>
        d.path === '/issues/0' && /classification or targets/.test(d.message),
    ),
  );
  assert.ok(item.every((d) => !/required property/.test(d.message)));
  const badField = thrown(() =>
    applyChoices(
      state,
      { issues: [{ targets: 'private-probe-text' }] },
      'agent',
    ),
  );
  assert.ok(badField.some((d) => d.path === '/issues/0/issueId'));
  assert.ok(
    badField.some(
      (d) => d.path === '/issues/0/targets' && /array/.test(d.message),
    ),
  );
  assert.ok(!JSON.stringify(badField).includes('private-probe-text'));
  const empty = thrown(() =>
    applyChoices(state, { domains: [], categories: [], issues: [] }, 'agent'),
  );
  assert.ok(empty.some((d) => /nonempty/.test(d.message)));
  const badState = thrown(() =>
    assertState({ ...state, 'extra/~': 'private-probe-text' }),
  );
  assert.ok(
    badState.some((d) => d.path === '/extra~1~0' && d.input === 'state'),
  );
  assert.ok(badState.every((d) => d.fix !== typo[0].fix));
  assert.ok(!JSON.stringify(badState).includes('private-probe-text'));
  assert.deepEqual(
    applyChoices(
      state,
      { issues: [{ issueId: state.map.issues[0].id, targets: [] }] },
      'agent',
    ).map.issues[0].targets,
    [],
  );
});

test('null and omitted descriptions are equivalent evidence while observed facts and real text changes remain distinct', () => {
  for (const [index, field] of [
    [0, 'description'],
    [2, 'body'],
  ]) {
    for (const omittedFirst of [false, true]) {
      const capture = mixedCapture();
      if (omittedFirst) delete capture.records[index].data[field];
      else capture.records[index].data[field] = null;
      const previous = rememberMap(mixedMap(capture));
      // A valid saved evidence object can contain null as well as omission.
      if (!omittedFirst) previous.memory[index].evidence.description = null;
      if (omittedFirst) capture.records[index].data[field] = null;
      else delete capture.records[index].data[field];
      const next = refreshState(previous, capture);
      assert.deepEqual(next.changes.review, []);
      assert.deepEqual(
        next.map.issues[index].classification,
        previous.map.issues[index].classification,
      );
      assert.equal(
        next.map.issues[index].description,
        omittedFirst ? null : undefined,
      );
      assert.equal(
        Object.hasOwn(next.map.issues[index], 'description'),
        omittedFirst,
      );
      for (const text of ['', ' ', 'A new work purpose']) {
        capture.records[index].data[field] = text;
        const changed = refreshState(next, capture);
        assert.ok(
          changed.changes.review.some(
            (r) =>
              r.issueId === next.map.issues[index].id &&
              r.reason === 'purpose-text-changed',
          ),
        );
        assert.equal(changed.map.issues[index].classification, undefined);
      }
      delete capture.records[index].data[field];
      capture.records[index].data.title = 'Changed purpose title';
      assert.ok(
        refreshState(next, capture).changes.review.some(
          (r) => r.reason === 'purpose-text-changed',
        ),
      );
    }
  }
});

test('run output refusals are structured and preserve files, directories and symlinks', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-output-diagnostics-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const mapPath = join(dir, 'map.json'),
    occupied = join(dir, 'occupied');
  const mapBytes = JSON.stringify(mixedMap());
  await writeFile(mapPath, mapBytes);
  await mkdir(occupied);
  const sentinel = join(occupied, 'keep.txt');
  await writeFile(sentinel, 'private-probe-text');
  const alias = join(dir, 'alias'),
    dangling = join(dir, 'dangling');
  await symlink(occupied, alias);
  await symlink(join(dir, 'missing'), dangling);
  for (const output of [occupied, mapPath, alias, dangling]) {
    const errors = diagnostics(run('remember', mapPath, output));
    assert.equal(errors[0].code, 'run-output');
    assert.equal(errors[0].path, '/run');
    assert.match(errors[0].message, /already exists/);
    assert.match(errors[0].fix, /fresh unused/);
  }
  assert.equal((await lstat(alias)).isSymbolicLink(), true);
  assert.equal((await lstat(dangling)).isSymbolicLink(), true);
  const invalidParent = join(mapPath, 'child');
  assert.match(
    diagnostics(run('remember', mapPath, invalidParent))[0].message,
    /not a directory/,
  );
  if (process.getuid?.() !== 0) {
    const locked = join(dir, 'locked');
    await mkdir(locked);
    await chmod(locked, 0o500);
    try {
      assert.match(
        diagnostics(run('remember', mapPath, join(locked, 'child')))[0].message,
        /not writable/,
      );
      await assert.rejects(lstat(join(locked, 'child')), { code: 'ENOENT' });
    } finally {
      await chmod(locked, 0o700);
    }
  }
  assert.equal(await readFile(mapPath, 'utf8'), mapBytes);
  assert.equal(await readFile(sentinel, 'utf8'), 'private-probe-text');
});

test('a retained classification notice follows prior full evidence and clears only when reconsidered or fetched', () => {
  for (const actor of ['agent', 'user']) {
    const map = mixedMap();
    map.issues[3].classification.origin = actor;
    const capture = mixedCapture();
    capture.records.splice(3, 1);
    const next = refreshState(rememberMap(map), capture);
    const issue = next.map.issues.find(
      (i) => i.nativeId === 'I_invented_delivery_7',
    );
    assert.equal(issue.detail, 'unqueried');
    assert.equal(issue.status.type, 'unknown');
    assert.equal(issue.classification.origin, actor);
    assert.equal(issue.classificationEvidence, 'previous-observation');
    const again = refreshState(next, capture);
    assert.equal(
      again.map.issues.find((i) => i.id === issue.id).classificationEvidence,
      'previous-observation',
    );
    assert.deepEqual(again.changes.updated, []);
    const targetOnly = applyChoices(
      again,
      { issues: [{ issueId: issue.id, targets: [] }] },
      actor,
    );
    assert.equal(
      targetOnly.map.issues.find((i) => i.id === issue.id)
        .classificationEvidence,
      'previous-observation',
    );
    const choice = {
      issues: [
        {
          issueId: issue.id,
          classification: {
            category: issue.classification.category,
            rationale: issue.classification.rationale,
          },
        },
      ],
    };
    if (actor === 'user') {
      const noop = applyChoices(again, choice, 'agent');
      assert.equal(
        noop.map.issues.find((i) => i.id === issue.id).classificationEvidence,
        'previous-observation',
      );
    }
    const revised = applyChoices(again, choice, actor);
    assert.equal(
      revised.map.issues.find((i) => i.id === issue.id).classificationEvidence,
      undefined,
    );
    const returned = refreshState(next, mixedCapture());
    assert.equal(returned.map.issues[3].classificationEvidence, undefined);
    assert.ok(
      returned.changes.updated.every(
        (u) => !u.fields.includes('classificationEvidence'),
      ),
    );
    const bad = structuredClone(returned.map);
    bad.issues[3].classificationEvidence = 'previous-observation';
    assert.ok(
      validateWorkMap(bad).diagnostics.some(
        (d) => d.path === '/issues/3/classificationEvidence',
      ),
    );
  }
  const capture = mixedCapture();
  capture.records.splice(3, 1);
  const map = mixedMap(capture),
    context = map.issues.find((i) => i.detail === 'unqueried');
  context.classification = {
    category: 'delivery',
    rationale: 'Based on the available endpoint',
    origin: 'agent',
  };
  const fresh = refreshState(rememberMap(map), capture);
  assert.equal(
    fresh.map.issues.find((i) => i.id === context.id).classificationEvidence,
    undefined,
  );
});

test('failed output cleanup preserves the original write error and discloses only owned leftovers', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-cleanup-diagnostics-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = join(dir, 'failed');
  const sentinel = join(dir, 'keep.txt');
  await writeFile(sentinel, 'unchanged');
  // Isolate built-in fault injection from the test process and other tests.
  const program = `
    import fs from 'node:fs/promises';
    import { syncBuiltinESMExports } from 'node:module';
    const realOpen = fs.open;
    fs.open = async (...args) => {
      const handle = await realOpen(...args);
      return { writeFile: async () => { throw Object.assign(new Error('private-probe-text write'), { code: 'EIO' }); }, close: async () => { await handle.close(); throw Object.assign(new Error('private-probe-text close'), { code: 'EBADF' }); } };
    };
    fs.unlink = async () => { throw Object.assign(new Error('private-probe-text cleanup'), { code: 'EACCES' }); };
    syncBuiltinESMExports();
    const { rememberMap, writeRun } = await import(${JSON.stringify(new URL('../lib/continuity.js', import.meta.url).href)});
    const { mixedMap } = await import(${JSON.stringify(new URL('./fixtures.js', import.meta.url).href)});
    try { await writeRun(rememberMap(mixedMap()), ${JSON.stringify(output)}); process.exitCode = 2; }
    catch (error) { console.log(JSON.stringify({ diagnostics: error.diagnostics, cause: error.cause?.code })); }
  `;
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', program],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.cause, 'EIO');
  assert.equal(failure.diagnostics[0].code, 'run-output');
  assert.match(failure.diagnostics[0].cleanup, /may remain/);
  assert.ok(!result.stdout.includes('private-probe-text'));
  assert.equal(await readFile(sentinel, 'utf8'), 'unchanged');
  assert.equal((await lstat(join(output, 'state.json'))).isFile(), true);
  await assert.rejects(lstat(join(output, 'work-map.json')), {
    code: 'ENOENT',
  });
});
