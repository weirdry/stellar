import { assertWorkMap } from '../lib/validate.ts';
import { objectJSON, array, record, diagnostic } from './support.ts';
import type { WorkMap } from '../lib/contracts.ts';
import { failure as readFailure } from './support.ts';
import { must } from './support.ts';
import { getDiagnostics } from './support.ts';
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mixedCapture, mixedMap } from './fixtures.ts';
import { rememberMap, refreshState, applyChoices } from '../lib/continuity.ts';
import { renderFile, renderWorkMap } from '../lib/render.ts';
import { verifyRun } from '../lib/verify.ts';

const captureFixture = () => {
  const capture = mixedCapture();
  must(must(must(capture.records[0]).data.relations).relatedTo).push({
    id: 'OBS-9',
    uuid: 'invented-context-9',
    title: 'Unfetched observatory context',
  });
  must(must(capture.records[1]).data.relations).duplicateOf = { id: 'OBS-1' };
  return capture;
};
const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
const run = (...args: string[]) =>
  spawnSync(process.execPath, [cli, 'verify-run', ...args], {
    encoding: 'utf8',
  });
const verify = async (capture: unknown, map: unknown, extra = {}) =>
  verifyRun({ capture, map, html: await renderWorkMap(map), ...extra });

async function renderedInputs(t: test.TestContext, owner: string) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-verification-bytes-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const capture = captureFixture();
  capture.owner = owner;
  const map = mixedMap(capture);
  const paths = ['capture.json', 'map.json', 'report.html'].map((name) =>
    join(dir, name),
  );
  await writeFile(must(paths[0]), JSON.stringify(capture));
  await writeFile(must(paths[1]), JSON.stringify(map));
  await renderFile(must(paths[1]), must(paths[2]));
  return paths;
}

void test('CLI rejects changed HTML bytes even when UTF-8 decoding hides the corruption', async (t) => {
  const paths = await renderedInputs(t, 'Ari\ufffd');
  const original = await readFile(must(paths[2]));
  const replacement = Buffer.from('\ufffd', 'utf8');
  const at = original.indexOf(replacement);
  assert.ok(at >= 0);
  const corrupt = Buffer.concat([
    original.subarray(0, at),
    Buffer.from([0xff]),
    original.subarray(at + replacement.length),
  ]);
  assert.notDeepEqual(corrupt, original);
  assert.equal(corrupt.toString('utf8'), original.toString('utf8'));
  const corruptPath = join(dirname(must(paths[2])), 'corrupt.html');
  await writeFile(corruptPath, corrupt);
  const result = run(must(paths[0]), must(paths[1]), corruptPath);
  assert.equal(result.status, 1, result.stdout);
  const report = objectJSON(result.stdout);
  assert.equal(report['valid'], false);
  assert.deepEqual(report['checks'], {
    captureFacts: 'pass',
    embeddedMap: 'pass',
    bundledViewer: 'fail',
    stateMap: 'not-provided',
  });
  assert.deepEqual(await readFile(must(paths[2])), original);
  assert.deepEqual(await readFile(corruptPath), corrupt);
});

void test('CLI accepts untouched rendered files from JSON containing lone surrogates', async (t) => {
  for (const owner of ['Ari\ud800', 'Ari\udc00']) {
    const paths = await renderedInputs(t, owner);
    const original = await readFile(must(paths[2]));
    assert.ok(original.includes(Buffer.from('\ufffd', 'utf8')));
    assert.ok(original.includes(Buffer.from(JSON.stringify(owner), 'utf8')));
    const result = run(...paths);
    assert.equal(result.status, 0, result.stdout || result.stderr);
    const report = objectJSON(result.stdout);
    assert.equal(report['valid'], true);
    assert.equal(record(report['checks'])['embeddedMap'], 'pass');
    assert.equal(record(report['checks'])['bundledViewer'], 'pass');
    assert.deepEqual(await readFile(must(paths[2])), original);
  }
});

void test('CLI mismatch paths hide unknown embedded keys and retain known field locations', async (t) => {
  const paths = await renderedInputs(t, 'Ari');
  const originals = await Promise.all(paths.map((path) => readFile(path)));
  const map = assertWorkMap(JSON.parse(must(originals[1]).toString('utf8')));
  const marker = 'private-probe-text/~';
  const cases: [(map: WorkMap) => unknown, string][] = [
    [(data) => Reflect.set(data, marker, true), '/data'],
    [
      (data) => Reflect.set(must(data.issues[0]), marker, true),
      '/data/issues/0',
    ],
    [
      (data) => Reflect.set(must(data.issues[0]).status, marker, true),
      '/data/issues/0/status',
    ],
    [
      (data) =>
        Reflect.set(data.issues, String(data.issues.length), {
          [marker]: true,
        }),
      '/data/issues',
    ],
    [
      (data) => Reflect.deleteProperty(must(data.issues[0]), 'title'),
      '/data/issues/0/title',
    ],
    [(data) => (must(data.issues[0]).title = marker), '/data/issues/0/title'],
  ];
  for (const [index, [mutate, expectedPath]] of cases.entries()) {
    const changed = structuredClone(map);
    mutate(changed);
    const html = must(originals[2])
      .toString('utf8')
      .replace(
        /(<script type="application\/json" id="data">)[\s\S]*?(<\/script>)/,
        (_, start, end) =>
          start + JSON.stringify(changed).replace(/</g, '\\u003c') + end,
      );
    const changedPath = join(dirname(must(paths[2])), `changed-${index}.html`);
    await writeFile(changedPath, html);
    const result = run(must(paths[0]), must(paths[1]), changedPath);
    assert.equal(result.status, 1, result.stdout || result.stderr);
    const report = objectJSON(result.stdout);
    assert.deepEqual(report['checks'], {
      captureFacts: 'pass',
      embeddedMap: 'fail',
      bundledViewer: 'fail',
      stateMap: 'not-provided',
    });
    assert.equal(
      diagnostic(array(report['diagnostics'])[0]).path,
      expectedPath,
    );
    assert.equal(diagnostic(array(report['diagnostics'])[0]).input, 'html');
    assert.ok(!(result.stdout + result.stderr).includes('private-probe-text'));
    assert.equal(await readFile(changedPath, 'utf8'), html);
  }
  for (const [index, path] of paths.entries())
    assert.deepEqual(await readFile(path), originals[index]);
});

void test('verification permits interpretation and presentation edits, array order and related direction without mutation', async () => {
  for (const locale of ['ko', 'en'] as const) {
    const capture = captureFixture();
    const map = mixedMap(capture);
    map.locale = locale;
    map.view.initialScope = 'all';
    must(map.categories[0]).basis = 'An independently reviewed inclusion rule';
    must(must(map.issues[0]).classification).rationale =
      'An authored interpretation';
    must(map.issues[0]).targets = ['Shared interpretation'];
    map.attachments = [
      { title: 'Notes', href: 'notes.html', note: 'A local reference' },
    ];
    const unknown = map.issues.find((issue) => issue.detail === 'unqueried');
    assert.ok(unknown);
    unknown.status.label = 'A placeholder from another UI locale';
    unknown.classification = { ...must(must(map.issues[0]).classification) };
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

void test('verification detects valid but altered source fields, declarations and set membership', async () => {
  const mutations: [(map: WorkMap) => unknown, string][] = [
    [
      (map) => {
        map.owner = 'Different owner';
      },
      '/owner',
    ],
    [
      (map) => {
        must(map.issues[0]).title = 'private-probe-text';
      },
      '/issues/0/title',
    ],
    [
      (map) => {
        must(map.issues[0]).description = 'private-probe-text';
      },
      '/issues/0/description',
    ],
    [
      (map) => {
        must(map.issues[0]).status.label = 'Another source label';
      },
      '/issues/0/status/label',
    ],
    [
      (map) => {
        must(map.issues[0]).scope = 'context';
      },
      '/issues/0/scope',
    ],
    [
      (map) => {
        must(map.issues[0]).nativeId = 'another-native-id';
      },
      '/issues/0/nativeId',
    ],
    [
      (map) => {
        must(map.sources[0]).coverage.issues = 'partial';
      },
      '/sources/0/coverage/issues',
    ],
    [
      (map) => {
        must(map.sources[0]).snapshotAt = '2026-09-10T00:00:00Z';
      },
      '/sources/0/snapshotAt',
    ],
    [
      (map) => {
        must(map.sources[0]).notes = 'Different collection limits';
      },
      '/sources/0/notes',
    ],
    [
      (map) => {
        const removed = must(map.issues.pop());
        map.relations = map.relations.filter(
          (edge) => ![edge.source, edge.target].includes(removed.id),
        );
      },
      '/issues',
    ],
    [
      (map) => {
        map.issues.push({
          ...structuredClone(must(map.issues[0])),
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

void test('registered relation omissions and directed reversals cannot pass by rendering the altered map', async () => {
  for (const kind of ['blocks', 'parent', 'duplicate']) {
    const capture = captureFixture(),
      map = mixedMap(capture);
    const edge = map.relations.find((edge) => edge.kind === kind);
    assert.ok(edge, kind);
    [edge.source, edge.target] = [edge.target, edge.source];
    const result = await verify(capture, map);
    assert.equal(result.checks.captureFacts, 'fail');
    assert.equal(must(result.diagnostics[0]).path, '/relations');
  }
  const capture = captureFixture(),
    map = mixedMap(capture);
  map.relations.pop();
  assert.equal((await verify(capture, map)).checks.captureFacts, 'fail');
});

void test('HTML checks separate embedded data from exact viewer output without executing supplied scripts', async () => {
  const capture = captureFixture(),
    map = mixedMap(capture);
  must(must(map.issues[0]).classification).rationale =
    '</script><!-- __CSS__ \u2028 \u2029 private-probe-text';
  const html = await renderWorkMap(map);
  assert.equal((await verifyRun({ capture, map, html })).valid, true);
  const changed = structuredClone(map);
  must(changed.categories[0]).label = 'Different category';
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

void test('saved state validation and final-map equality remain separate from historical continuity proof', async () => {
  const capture = captureFixture(),
    map = mixedMap(capture);
  const state = rememberMap(map);
  assert.equal((await verify(capture, map, { state })).checks.stateMap, 'pass');
  const changed = applyChoices(
    state,
    {
      issues: [
        { issueId: must(map.issues[0]).id, targets: ['New user target'] },
      ],
    },
    'user',
  );
  const result = await verify(capture, map, { state: changed });
  assert.equal(result.checks.stateMap, 'fail');
  assert.equal(must(result.diagnostics[0]).input, 'state');
  assert.ok(result.notChecked.includes('prior-state-continuity'));
  const invalid = structuredClone(state);
  must(invalid.memory[0]).targets = ['Inconsistent'];
  await assert.rejects(verify(capture, map, { state: invalid }), (error) =>
    getDiagnostics(error).every((d) => d.input === 'state'),
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
  must(fullIssue).classification = {
    ...must(must(map.issues[0]).classification),
  };
  const refreshed = refreshState(rememberMap(fullMap), capture);
  assert.equal(
    must(refreshed.map.issues.find((issue) => issue.id === context.id))
      .classificationEvidence,
    'previous-observation',
  );
  assert.equal(
    (await verify(capture, refreshed.map, { state: refreshed })).valid,
    true,
  );
});

void test('CLI accepts optional state and symlinks, reports mismatches, and leaves every input untouched', async (t) => {
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
    await writeFile(path, must(contents[index]), { mode: 0o400 });
  const alias = join(dir, 'report alias.html');
  await symlink(must(paths[2]), alias);
  const names = await readdir(dir);
  for (const args of [
    paths.slice(0, 3),
    paths,
    [must(paths[0]), must(paths[1]), alias, must(paths[3])],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(objectJSON(result.stdout)['valid'], true);
  }
  const mismatch = run(must(paths[0]), must(paths[1]), must(paths[0]));
  assert.equal(mismatch.status, 1);
  assert.equal(
    record(objectJSON(mismatch.stdout)['checks'])['embeddedMap'],
    'fail',
  );
  for (const [index, path] of paths.entries())
    assert.equal(await readFile(path, 'utf8'), contents[index]);
  assert.deepEqual(await readdir(dir), names);
});

void test('CLI input failures identify roles without raw paths or excerpts, and incorrect arity is usage error', async (t) => {
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
    await writeFile(path, must(contents[index]));
  const roles = ['capture', 'work-map', 'html', 'state'];
  for (const [index, role] of roles.entries()) {
    const args = [...paths];
    args[index] = join(dir, 'private-probe-text-missing');
    const missing = run(...args);
    assert.equal(missing.status, 1);
    const diagnostic = readFailure(missing.stderr).diagnostics[0];
    assert.equal(must(diagnostic).code, 'input-read');
    assert.equal(must(diagnostic).input, role);
    assert.ok(
      !missing.stderr.includes(dir) &&
        !missing.stderr.includes('private-probe-text'),
    );
    if (role === 'html') continue;
    await writeFile(must(paths[index]), '{"private-probe-text":');
    const invalid = run(...paths);
    assert.equal(invalid.status, 1);
    assert.equal(must(readFailure(invalid.stderr).diagnostics[0]).input, role);
    assert.ok(!invalid.stderr.includes('private-probe-text'));
    await writeFile(must(paths[index]), must(contents[index]));
  }
  for (const args of [[], paths.slice(0, 2), [...paths, 'extra']])
    assert.equal(run(...args).status, 2);
  await writeFile(must(paths[0]), '{}');
  assert.equal(
    must(readFailure(run(...paths).stderr).diagnostics[0]).input,
    'capture',
  );
  await writeFile(must(paths[0]), must(contents[0]));
  await writeFile(must(paths[1]), '{}');
  assert.equal(
    must(readFailure(run(...paths).stderr).diagnostics[0]).input,
    'work-map',
  );
});
