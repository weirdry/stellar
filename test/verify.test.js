import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  writeFile,
  readdir,
  rm,
  symlink,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mixedCapture, mixedMap } from './fixtures.js';
import { rememberMap, refreshState, applyChoices } from '../lib/continuity.js';
import { renderWorkMap } from '../lib/render.js';
import { verifyRun } from '../lib/verify.js';

const captureFixture = () => {
  const capture = mixedCapture();
  capture.records[0].data.relations.relatedTo.push({
    id: 'OBS-9',
    uuid: 'invented-context-9',
    title: 'Unfetched observatory context',
  });
  capture.records[1].data.relations.duplicateOf = { id: 'OBS-1' };
  return capture;
};
const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
const run = (...args) =>
  spawnSync(process.execPath, [cli, 'verify-run', ...args], {
    encoding: 'utf8',
  });
const verify = async (capture, map, extra = {}) =>
  verifyRun({ capture, map, html: await renderWorkMap(map), ...extra });

test('verification permits interpretation and presentation edits, array order and related direction without mutation', async () => {
  for (const locale of ['ko', 'en']) {
    const capture = captureFixture();
    const map = mixedMap(capture);
    map.locale = locale;
    map.view.initialScope = 'all';
    map.categories[0].basis = 'An independently reviewed inclusion rule';
    map.issues[0].classification.rationale = 'An authored interpretation';
    map.issues[0].targets = ['Shared interpretation'];
    map.attachments = [
      { title: 'Notes', href: 'notes.html', note: 'A local reference' },
    ];
    const unknown = map.issues.find((issue) => issue.detail === 'unqueried');
    assert.ok(unknown);
    unknown.status.label = 'A placeholder from another UI locale';
    unknown.classification = { ...map.issues[0].classification };
    unknown.classificationEvidence = 'previous-observation';
    map.issues.reverse();
    map.sources.reverse();
    map.relations.reverse();
    for (const edge of map.relations.filter((edge) => edge.kind === 'related'))
      [edge.source, edge.target] = [edge.target, edge.source];
    const before = structuredClone({ capture, map });
    const result = await verify(capture, map);
    assert.equal(result.valid, true, JSON.stringify(result));
    assert.deepEqual(result.checks, {
      captureFacts: 'pass',
      embeddedMap: 'pass',
      bundledViewer: 'pass',
      stateMap: 'not-provided',
    });
    assert.ok(result.notChecked.includes('classification-meaning'));
    assert.ok(result.notChecked.includes('visual-interaction'));
    assert.deepEqual({ capture, map }, before);
  }
});

test('verification detects valid but altered source fields, declarations and set membership', async () => {
  const mutations = [
    [
      (map) => {
        map.owner = 'Different owner';
      },
      '/owner',
    ],
    [
      (map) => {
        map.issues[0].title = 'private-probe-text';
      },
      '/issues/0/title',
    ],
    [
      (map) => {
        map.issues[0].description = 'private-probe-text';
      },
      '/issues/0/description',
    ],
    [
      (map) => {
        map.issues[0].status.label = 'Another source label';
      },
      '/issues/0/status/label',
    ],
    [
      (map) => {
        map.issues[0].scope = 'context';
      },
      '/issues/0/scope',
    ],
    [
      (map) => {
        map.issues[0].nativeId = 'another-native-id';
      },
      '/issues/0/nativeId',
    ],
    [
      (map) => {
        map.sources[0].coverage.issues = 'partial';
      },
      '/sources/0/coverage/issues',
    ],
    [
      (map) => {
        map.sources[0].snapshotAt = '2026-09-10T00:00:00Z';
      },
      '/sources/0/snapshotAt',
    ],
    [
      (map) => {
        map.sources[0].notes = 'Different collection limits';
      },
      '/sources/0/notes',
    ],
    [
      (map) => {
        const removed = map.issues.pop();
        map.relations = map.relations.filter(
          (edge) => ![edge.source, edge.target].includes(removed.id),
        );
      },
      '/issues',
    ],
    [
      (map) => {
        map.issues.push({
          ...structuredClone(map.issues[0]),
          id: 'extra',
          nativeId: 'extra',
          identifier: 'EXTRA-1',
        });
      },
      '/issues/6/id',
    ],
  ];
  for (const [mutate, path] of mutations) {
    const capture = captureFixture(),
      map = mixedMap(capture);
    mutate(map);
    const result = await verify(capture, map);
    assert.equal(result.valid, false);
    assert.equal(result.checks.embeddedMap, 'pass');
    assert.equal(result.checks.bundledViewer, 'pass');
    assert.ok(
      result.diagnostics.some((d) => d.input === 'work-map' && d.path === path),
      JSON.stringify(result),
    );
    assert.ok(!JSON.stringify(result).includes('private-probe-text'));
  }
});

test('registered relation omissions and directed reversals cannot pass by rendering the altered map', async () => {
  for (const kind of ['blocks', 'parent', 'duplicate']) {
    const capture = captureFixture(),
      map = mixedMap(capture);
    const edge = map.relations.find((edge) => edge.kind === kind);
    assert.ok(edge, kind);
    [edge.source, edge.target] = [edge.target, edge.source];
    const result = await verify(capture, map);
    assert.equal(result.checks.captureFacts, 'fail');
    assert.equal(result.diagnostics[0].path, '/relations');
  }
  const capture = captureFixture(),
    map = mixedMap(capture);
  map.relations.pop();
  assert.equal((await verify(capture, map)).checks.captureFacts, 'fail');
});

test('HTML checks separate embedded data from exact viewer output without executing supplied scripts', async () => {
  const capture = captureFixture(),
    map = mixedMap(capture);
  map.issues[0].classification.rationale =
    '</script><!-- __CSS__ \u2028 \u2029 private-probe-text';
  const html = await renderWorkMap(map);
  assert.equal((await verifyRun({ capture, map, html })).valid, true);
  const changed = structuredClone(map);
  changed.categories[0].label = 'Different category';
  for (const bad of [
    await renderWorkMap(changed),
    html.replace(
      /(<script type="application\/json" id="data">)[\s\S]*?<\/script>/,
      '$1{"private-probe-text":</script>',
    ),
    html + '<script type="application/json" id="data">{}</script>',
    html.replace('id="data"', 'id="other-data"'),
  ]) {
    const result = await verifyRun({ capture, map, html: bad });
    assert.equal(result.checks.embeddedMap, 'fail');
    assert.equal(result.checks.bundledViewer, 'fail');
    assert.ok(!JSON.stringify(result).includes('private-probe-text'));
  }
  const result = await verifyRun({
    capture,
    map,
    html: html + '<script>throw new Error("never execute")</script>',
  });
  assert.equal(result.checks.embeddedMap, 'pass');
  assert.equal(result.checks.bundledViewer, 'fail');
});

test('saved state validation and final-map equality remain separate from historical continuity proof', async () => {
  const capture = captureFixture(),
    map = mixedMap(capture);
  const state = rememberMap(map);
  assert.equal((await verify(capture, map, { state })).checks.stateMap, 'pass');
  const changed = applyChoices(
    state,
    { issues: [{ issueId: map.issues[0].id, targets: ['New user target'] }] },
    'user',
  );
  const result = await verify(capture, map, { state: changed });
  assert.equal(result.checks.stateMap, 'fail');
  assert.equal(result.diagnostics[0].input, 'state');
  assert.ok(result.notChecked.includes('prior-state-continuity'));
  const invalid = structuredClone(state);
  invalid.memory[0].targets = ['Inconsistent'];
  await assert.rejects(verify(capture, map, { state: invalid }), (error) =>
    error.diagnostics.every((d) => d.input === 'state'),
  );
  // A refresh-produced evidence notice must not be treated as a changed source fact.
  const full = structuredClone(capture);
  const context = map.issues.find(
    (issue) =>
      issue.detail === 'unqueried' && issue.sourceId === 'linear-observatory',
  );
  assert.ok(context);
  full.records.push({
    sourceId: context.sourceId,
    scope: 'context',
    data: {
      id: context.identifier,
      uuid: context.nativeId,
      title: 'Full context',
      status: 'Active',
      statusType: 'started',
      description: 'A remembered objective',
    },
  });
  const fullMap = mixedMap(full);
  const fullIssue = fullMap.issues.find(
    (issue) => issue.nativeId === context.nativeId,
  );
  fullIssue.classification = { ...map.issues[0].classification };
  const refreshed = refreshState(rememberMap(fullMap), capture);
  assert.equal(
    refreshed.map.issues.find((issue) => issue.id === context.id)
      .classificationEvidence,
    'previous-observation',
  );
  assert.equal(
    (await verify(capture, refreshed.map, { state: refreshed })).valid,
    true,
  );
});

test('CLI accepts optional state and symlinks, reports mismatches, and leaves every input untouched', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-verification-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const capture = captureFixture(),
    map = mixedMap(capture),
    state = rememberMap(map);
  const paths = [
    'capture input.json',
    'map input.json',
    'report.html',
    'state input.json',
  ].map((name) => join(dir, name));
  const contents = [
    JSON.stringify(capture),
    JSON.stringify(map),
    await renderWorkMap(map),
    JSON.stringify(state),
  ];
  for (const [index, path] of paths.entries())
    await writeFile(path, contents[index], { mode: 0o400 });
  const alias = join(dir, 'report alias.html');
  await symlink(paths[2], alias);
  const names = await readdir(dir);
  for (const args of [
    paths.slice(0, 3),
    paths,
    [paths[0], paths[1], alias, paths[3]],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).valid, true);
  }
  const mismatch = run(paths[0], paths[1], paths[0]);
  assert.equal(mismatch.status, 1);
  assert.equal(JSON.parse(mismatch.stdout).checks.embeddedMap, 'fail');
  for (const [index, path] of paths.entries())
    assert.equal(await readFile(path, 'utf8'), contents[index]);
  assert.deepEqual(await readdir(dir), names);
});

test('CLI input failures identify roles without raw paths or excerpts, and incorrect arity is usage error', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-verification-errors-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const capture = captureFixture(),
    map = mixedMap(capture);
  const paths = ['capture.json', 'map.json', 'report.html', 'state.json'].map(
    (name) => join(dir, name),
  );
  const contents = [
    JSON.stringify(capture),
    JSON.stringify(map),
    await renderWorkMap(map),
    JSON.stringify(rememberMap(map)),
  ];
  for (const [index, path] of paths.entries())
    await writeFile(path, contents[index]);
  const roles = ['capture', 'work-map', 'html', 'state'];
  for (const [index, role] of roles.entries()) {
    const args = [...paths];
    args[index] = join(dir, 'private-probe-text-missing');
    const missing = run(...args);
    assert.equal(missing.status, 1);
    const diagnostic = JSON.parse(missing.stderr).diagnostics[0];
    assert.equal(diagnostic.code, 'input-read');
    assert.equal(diagnostic.input, role);
    assert.ok(
      !missing.stderr.includes(dir) &&
        !missing.stderr.includes('private-probe-text'),
    );
    if (role === 'html') continue;
    await writeFile(paths[index], '{"private-probe-text":');
    const invalid = run(...paths);
    assert.equal(invalid.status, 1);
    assert.equal(JSON.parse(invalid.stderr).diagnostics[0].input, role);
    assert.ok(!invalid.stderr.includes('private-probe-text'));
    await writeFile(paths[index], contents[index]);
  }
  for (const args of [[], paths.slice(0, 2), [...paths, 'extra']])
    assert.equal(run(...args).status, 2);
  await writeFile(paths[0], '{}');
  assert.equal(
    JSON.parse(run(...paths).stderr).diagnostics[0].input,
    'capture',
  );
  await writeFile(paths[0], contents[0]);
  await writeFile(paths[1], '{}');
  assert.equal(
    JSON.parse(run(...paths).stderr).diagnostics[0].input,
    'work-map',
  );
});
