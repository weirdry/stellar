import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderWorkMap } from '../lib/render.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJSON = (path, data) => writeFile(path, JSON.stringify(data));

async function buildFixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-bundle-check-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const path of [
    'scripts/build-runner.js',
    'bin',
    'lib',
    'package.json',
    'schemas',
    'assets/viewer',
    'THIRD_PARTY_NOTICES.txt',
  ])
    await cp(join(root, path), join(dir, path), { recursive: true });
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  const build = (...args) =>
    spawnSync(process.execPath, ['scripts/build-runner.js', ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
  // The dependency symlink changes esbuild input paths; compare artifacts built
  // within this scratch tree, not a checkout and a different dependency layout.
  const generated = build();
  assert.equal(generated.status, 0, generated.stderr);
  const check = () => build('--check');
  const artifacts = async () =>
    Promise.all(
      [
        'bin/stellar.mjs',
        'bin/stellar.manifest.json',
        'THIRD_PARTY_NOTICES.txt',
      ].map((path) => readFile(join(dir, path))),
    );
  return { dir, build, check, artifacts };
}

test('installed bundle runs the map and continuity workflow without development files or dependencies', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-installed-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const installed = join(dir, 'installed skill'),
    work = join(dir, 'user work');
  await mkdir(work);
  for (const name of [
    'bin/stellar.mjs',
    'bin/stellar.manifest.json',
    'schemas',
    'assets/viewer',
    'LICENSE',
    'THIRD_PARTY_NOTICES.txt',
  ]) {
    await cp(join(root, name), join(installed, name), { recursive: true });
  }
  const run = (args, status = 0) => {
    // An unrelated cwd and empty lookup environment expose accidental reliance
    // on the checkout, a PATH tool, NODE_PATH, or installed npm dependencies.
    const result = spawnSync(
      process.execPath,
      [join(installed, 'bin/stellar.mjs'), ...args],
      {
        cwd: work,
        encoding: 'utf8',
        env: {},
      },
    );
    assert.equal(result.status, status, result.stderr || result.stdout);
    return result.stdout;
  };
  assert.match(run(['--help']), /classify-draft/);
  assert.equal(run(['-h']), run(['--help']));
  assert.match(run(['--version']), /^stellar /);
  assert.equal(JSON.parse(run(['doctor', '--json'])).ok, true);
  assert.equal(run(['help', 'normalize']), run(['normalize', '--help']));
  assert.equal(run(['help', 'normalize']), run(['normalize', '-h']));
  await cp(
    join(root, 'examples/mixed-capture.json'),
    join(work, 'capture.json'),
  );
  await cp(
    join(root, 'examples/mixed-choices.json'),
    join(work, 'choices.json'),
  );
  const before = await readFile(join(work, 'capture.json'));
  run(['normalize', 'capture.json', 'draft.json']);
  const draft = await json(join(work, 'draft.json'));
  assert.equal(
    JSON.parse(run(['inspect', 'draft.json'])).items.length,
    draft.issues.length,
  );
  const issue = draft.issues.find((item) => item.description);
  assert.ok(JSON.parse(run(['inspect', 'draft.json', issue.id])).items.length);
  run(['read-issue', 'draft.json', issue.id, '0']);
  run(['search-issue', 'draft.json', issue.id, issue.description.slice(0, 5)]);
  run(['classify-draft', 'draft.json', 'choices.json', 'first']);
  run(['retain-response', 'capture.json', 'first/capture.json']);
  run(['validate', 'first/work-map.json']);
  run(['render', 'first/work-map.json', 'first/stellar.html']);
  const map = await json(join(work, 'first/work-map.json'));
  assert.equal(
    await readFile(join(work, 'first/stellar.html'), 'utf8'),
    await renderWorkMap(map),
  );
  assert.equal(
    JSON.parse(
      run([
        'verify-run',
        'first/capture.json',
        'first/work-map.json',
        'first/stellar.html',
        'first/state.json',
      ]),
    ).valid,
    true,
  );
  run(['remember', 'first/work-map.json', 'remembered']);

  const choices = await json(join(work, 'choices.json'));
  const userChoice = {
    issues: [
      {
        issueId: choices.issues[0].issueId,
        classification: {
          category: 'control',
          rationale: 'Explicit synthetic user choice.',
        },
      },
    ],
  };
  await writeJSON(join(work, 'user.json'), userChoice);
  run(['revise', 'first/state.json', 'user.json', 'revised']);
  // An explicit user choice remains authoritative after a fresh observation.
  run(['refresh', 'revised/state.json', 'capture.json', 'refreshed']);
  const state = await json(join(work, 'refreshed/state.json'));
  assert.equal(state.changes.preservedUser.length, 1);
  assert.equal(state.map.issues[0].classification.origin, 'user');
  assert.equal(state.map.issues[0].classification.category, 'control');
  await writeJSON(join(work, 'overwrite.json'), {
    issues: [choices.issues[0]],
  });
  run(['classify', 'refreshed/state.json', 'overwrite.json', 'refused'], 1);
  await writeJSON(join(work, 'agent.json'), { issues: [choices.issues[1]] });
  run(['classify', 'refreshed/state.json', 'agent.json', 'classified']);
  run(['render', 'classified/work-map.json', 'classified/stellar.html']);
  assert.equal(
    JSON.parse(
      run([
        'verify-run',
        'capture.json',
        'classified/work-map.json',
        'classified/stellar.html',
        'classified/state.json',
      ]),
    ).valid,
    true,
  );
  const rendered = await readFile(join(work, 'classified/stellar.html'));
  run(['revise', 'classified/state.json', 'user.json', 'classified'], 1);
  assert.deepEqual(
    await readFile(join(work, 'classified/stellar.html')),
    rendered,
  );
  assert.deepEqual(await readFile(join(work, 'capture.json')), before);
  assert.match(
    await readFile(join(installed, 'THIRD_PARTY_NOTICES.txt'), 'utf8'),
    /ajv@/,
  );
});

test('bundle gate detects drift and never rewrites the generated artifact', async (t) => {
  const { dir, check, artifacts } = await buildFixture(t);
  const initial = check();
  assert.equal(initial.status, 0, initial.stderr);
  for (const name of ['bin/stellar.mjs', 'bin/stellar.manifest.json']) {
    const path = join(dir, name);
    const original = await readFile(path, 'utf8');
    const changed = original + '\n';
    await writeFile(path, changed);
    const result = check();
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(`${name} is stale`));
    assert.equal(await readFile(path, 'utf8'), changed);
    await writeFile(path, original);
  }
  const before = await artifacts();
  for (const [name, change, stale] of [
    [
      'lib/cli-help.js',
      (text) => text.replace('Stellar — inspect', 'Stellar — review'),
      'bin/stellar.mjs',
    ],
    [
      'assets/viewer/style.css',
      (text) => text + '\n/* synthetic resource drift */\n',
      'bin/stellar.manifest.json',
    ],
  ]) {
    const path = join(dir, name);
    const original = await readFile(path, 'utf8');
    const changed = change(original);
    assert.notEqual(changed, original);
    await writeFile(path, changed);
    const result = check();
    assert.equal(result.status, 1, result.stderr);
    assert.ok(result.stderr.includes(`${stale} is stale`));
    assert.equal(await readFile(path, 'utf8'), changed);
    assert.deepEqual(await artifacts(), before);
    await writeFile(path, original);
  }
  const pkgPath = join(dir, 'package.json');
  const pkg = await json(pkgPath);
  pkg.version = '0.0.0-test';
  await writeJSON(pkgPath, pkg);
  const changedVersion = check();
  assert.equal(changedVersion.status, 1, changedVersion.stderr);
  assert.match(changedVersion.stderr, /bin\/stellar.mjs is stale/);
  assert.match(changedVersion.stderr, /bin\/stellar.manifest.json is stale/);
  assert.deepEqual(await artifacts(), before);
});

test('only the product version enters the bundle from the root package manifest', async (t) => {
  const { dir, build, check, artifacts } = await buildFixture(t);
  const before = await artifacts();
  const pkgPath = join(dir, 'package.json');
  const pkg = await json(pkgPath);
  const marker = 'UNRELATED_PACKAGE_METADATA_SENTINEL';
  for (const mutate of [
    () => {
      pkg.scripts.lint = marker;
    },
    () => {
      pkg.devDependencies.prettier = '0.0.0-synthetic';
      pkg.description = marker;
    },
  ]) {
    mutate();
    await writeJSON(pkgPath, pkg);
    const checked = check();
    assert.equal(checked.status, 0, checked.stderr);
    assert.deepEqual(await artifacts(), before);
    const generated = build();
    assert.equal(generated.status, 0, generated.stderr);
    assert.deepEqual(await artifacts(), before);
    assert.ok(!before[0].toString().includes(marker));
  }
  pkg.version = '0.0.0-synthetic';
  await writeJSON(pkgPath, pkg);
  assert.equal(check().status, 1);
  const generated = build();
  assert.equal(generated.status, 0, generated.stderr);
  for (const runner of ['bin/stellar.js', 'bin/stellar.mjs']) {
    const result = spawnSync(
      process.execPath,
      [join(dir, runner), '--version'],
      { env: {}, encoding: 'utf8' },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'stellar 0.0.0-synthetic\n');
  }
  assert.equal(
    (await json(join(dir, 'bin/stellar.manifest.json'))).version,
    pkg.version,
  );
  assert.match(
    await readFile(join(dir, 'THIRD_PARTY_NOTICES.txt'), 'utf8'),
    /ajv@/,
  );
});

test('resource coverage rejects unlisted runtime files before checking or generating artifacts', async (t) => {
  const { dir, build, check, artifacts } = await buildFixture(t);
  const before = await artifacts();
  for (const name of [
    'schemas/new.schema.json',
    'assets/viewer/locales/zz.json',
    'assets/viewer/new.html',
    'assets/viewer/new.css',
    'assets/viewer/new.js',
    'assets/viewer/new.svg',
  ]) {
    const path = join(dir, name);
    await writeFile(path, 'SYNTHETIC_RESOURCE');
    for (const run of [check, build]) {
      const result = run();
      assert.equal(result.status, 1, result.stderr);
      assert.ok(result.stderr.includes(`Missing from runtimeFiles: ${name}`));
      assert.match(result.stderr, /lib\/installation.js/);
      assert.equal(await readFile(path, 'utf8'), 'SYNTHETIC_RESOURCE');
      assert.deepEqual(await artifacts(), before);
    }
    await rm(path);
  }
  const missing = join(dir, 'schemas/state.schema.json');
  const original = await readFile(missing);
  await rm(missing);
  const result = check();
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /Unexpected or absent resources: schemas\/state.schema.json/,
  );
  assert.deepEqual(await artifacts(), before);
  await writeFile(missing, original);
  // Contributor docs, optional images, and brand assets are not runtime inputs.
  for (const name of [
    'schemas/notes.md',
    'assets/viewer/notes.md',
    'assets/viewer/preview.png',
    'assets/brand/optional.svg',
  ]) {
    await mkdir(join(dir, name, '..'), { recursive: true });
    await writeFile(join(dir, name), 'OPTIONAL_ASSET');
  }
  const healthy = check();
  assert.equal(healthy.status, 0, healthy.stderr);
  assert.deepEqual(await artifacts(), before);
});
