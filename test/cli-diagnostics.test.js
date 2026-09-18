import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cp,
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commands } from '../lib/cli-help.js';
import { manifestPath, runtimeFiles, sha256 } from '../lib/installation.js';
import { version } from '../lib/version.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function setup(t, complete = true) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-diagnostics-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const installed = join(dir, 'installed skill');
  const work = join(dir, 'unrelated work');
  await mkdir(work);
  for (const path of complete
    ? [...runtimeFiles, manifestPath]
    : ['bin/stellar.mjs'])
    await cp(join(root, path), join(installed, path), { recursive: true });
  const run = (args, cli = join(installed, 'bin/stellar.mjs')) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: work,
      env: {},
      encoding: 'utf8',
    });
  return { dir, installed, work, run };
}

async function snapshot(directory) {
  const result = {};
  async function visit(path) {
    for (const entry of await readdir(join(directory, path), {
      withFileTypes: true,
    })) {
      const relative = join(path, entry.name);
      if (entry.isDirectory()) await visit(relative);
      else result[relative] = sha256(await readFile(join(directory, relative)));
    }
  }
  await visit('');
  return result;
}

test('version and every help topic work without schemas, resources, installer metadata, or input files', async (t) => {
  const { installed, work, run } = await setup(t, false);
  for (const cli of [
    join(root, 'bin/stellar.js'),
    join(installed, 'bin/stellar.mjs'),
  ]) {
    for (const flag of ['--version', '-V']) {
      const result = run([flag], cli);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, `stellar ${version}\n`);
      assert.equal(result.stderr, '');
    }
    for (const command of Object.keys(commands)) {
      const a = run(['help', command], cli);
      const b = run([command, '--help'], cli);
      assert.equal(a.status, 0, a.stderr);
      assert.equal(b.status, 0, b.stderr);
      assert.equal(a.stdout, b.stdout);
      for (const section of [
        'Usage:',
        'Arguments:',
        'Output:',
        'Example:',
        'Exit codes:',
      ])
        assert.ok(a.stdout.includes(section), `${command}: ${section}`);
    }
    const global = run(['--help'], cli);
    assert.equal(global.status, 0);
    assert.equal(global.stdout, run(['help'], cli).stdout);
    for (const command of Object.keys(commands))
      assert.ok(global.stdout.includes(command));
  }
  assert.deepEqual(await readdir(work), []);
});

test('doctor diagnoses a healthy installed copy and resolves a symlink independently of cwd', async (t) => {
  const { dir, installed, run } = await setup(t);
  const alias = join(dir, 'stellar alias.mjs');
  await symlink(join(installed, 'bin/stellar.mjs'), alias);
  const before = await snapshot(dir);
  const result = run(['doctor', '--json'], alias);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const data = JSON.parse(result.stdout);
  assert.equal(data.ok, true);
  // macOS exposes /var through the canonical /private/var path.
  const { realpath } = await import('node:fs/promises');
  assert.equal(data.root, await realpath(installed));
  assert.equal(data.version, version);
  assert.equal(data.checks.length, runtimeFiles.length + 2);
  assert.ok(data.checks.every((check) => check.status === 'pass'));
  assert.match(data.scope, /does not verify.*host skill discovery/);
  const text = run(['doctor']);
  assert.equal(text.status, 0);
  assert.match(text.stdout, /Local installation checks passed/);
  assert.deepEqual(await snapshot(dir), before);
});

test('doctor reports all missing and changed resources without loading them or exposing their contents', async (t) => {
  const { dir, installed, work, run } = await setup(t);
  const secret = 'PRIVATE_SYNTHETIC_SENTINEL';
  await writeFile(join(work, 'private.json'), secret);
  await rm(join(installed, 'schemas/state.schema.json'));
  await writeFile(
    join(installed, 'schemas/work-map.schema.json'),
    `{ "${secret}":`,
  );
  await writeFile(join(installed, 'assets/viewer/style.css'), secret);
  await writeFile(join(installed, 'assets/viewer/stellar.svg'), '<svg');
  await writeFile(
    join(installed, 'assets/viewer/app.js'),
    `throw new Error('${secret}');`,
  );
  await rm(join(installed, 'assets/viewer/locales/en.json'));
  await mkdir(join(installed, 'assets/viewer/locales/en.json'));
  const before = await snapshot(dir);
  const result = run(['doctor', '--json']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, '');
  assert.ok(!result.stdout.includes(secret));
  const data = JSON.parse(result.stdout);
  assert.equal(data.ok, false);
  const failed = data.checks.filter((check) => check.status === 'fail');
  assert.equal(failed.length, 6);
  assert.ok(failed.every((check) => check.fix.includes('Reinstall')));
  assert.match(
    failed.find((check) => check.id === 'schemas/state.schema.json').message,
    /missing/,
  );
  assert.match(
    failed.find((check) => check.id.endsWith('en.json')).message,
    /not a regular file/,
  );
  assert.equal(run(['--version']).status, 0);
  assert.equal(run(['validate', '--help']).status, 0);
  const runtime = run(['validate', 'private.json']);
  assert.equal(runtime.status, 1);
  assert.match(runtime.stderr, /doctor/);
  assert.ok(!runtime.stderr.includes(secret));
  assert.deepEqual(await snapshot(dir), before);
});

test('doctor treats absent or invalid manifests as failure and never follows manifest-supplied paths', async (t) => {
  const { dir, installed, work, run } = await setup(t);
  const path = join(installed, manifestPath);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const secret = 'PRIVATE_MANIFEST_SENTINEL';
  await writeFile(join(work, 'private.json'), secret);
  const cases = [
    null,
    `{ "${secret}":`,
    JSON.stringify({ ...manifest, version: '0.0.0' }),
    JSON.stringify({
      ...manifest,
      files: { '../../unrelated work/private.json': '0'.repeat(64) },
    }),
  ];
  for (const content of cases) {
    if (content === null) await rm(path);
    else await writeFile(path, content);
    const before = await snapshot(dir);
    const result = run(['doctor', '--json']);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, '');
    assert.ok(!result.stdout.includes(secret));
    const data = JSON.parse(result.stdout);
    assert.equal(
      data.checks.find((check) => check.id === manifestPath).status,
      'fail',
    );
    assert.equal(
      data.checks.filter((check) => check.status === 'skip').length,
      runtimeFiles.length,
    );
    assert.deepEqual(await snapshot(dir), before);
  }
});

test(
  'doctor reports unreadable required files without repairing permissions',
  {
    skip: process.platform === 'win32' || process.getuid?.() === 0,
  },
  async (t) => {
    const { installed, run } = await setup(t);
    const path = join(installed, 'assets/viewer/style.css');
    await chmod(path, 0);
    try {
      const result = run(['doctor', '--json']);
      assert.equal(result.status, 1, result.stderr);
      const check = JSON.parse(result.stdout).checks.find((item) =>
        item.id.endsWith('style.css'),
      );
      assert.equal(check.status, 'fail');
      assert.match(check.message, /cannot be read/);
      await assert.rejects(readFile(path), { code: 'EACCES' });
    } finally {
      await chmod(path, 0o600);
    }
  },
);

test('doctor flags an unsupported Node runtime without hiding independent file checks', async (t) => {
  const { installed, run } = await setup(t);
  const preload = join(installed, 'unsupported.cjs');
  await writeFile(
    preload,
    "Object.defineProperty(process.versions, 'node', { value: '22.0.0' });",
  );
  const result = spawnSync(
    process.execPath,
    [
      '--require',
      preload,
      join(installed, 'bin/stellar.mjs'),
      'doctor',
      '--json',
    ],
    { env: {}, encoding: 'utf8' },
  );
  assert.equal(result.status, 1, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.checks[0].status, 'fail');
  assert.match(data.checks[0].fix, /24.x/);
  assert.ok(data.checks.slice(1).every((check) => check.status === 'pass'));
  assert.equal(run(['doctor', '--json']).status, 0);
});

test('invalid argument counts and unknown topics fail before loading runtime or touching files', async (t) => {
  const { dir, run } = await setup(t, false);
  const before = await snapshot(dir);
  for (const args of [
    [],
    ['unknown'],
    ['__proto__'],
    ['help', 'unknown'],
    ['--help', 'render'],
    ['--version', 'extra'],
    ['-V', '--json'],
    ['doctor', '--fix'],
    ['doctor', '--json', 'extra'],
    ['render'],
    ['validate', 'missing.json', 'extra'],
    ['normalize', ''],
    ['help', 'render', 'extra'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /for usage/);
    assert.ok(!result.stderr.includes('ENOENT'));
  }
  assert.deepEqual(await snapshot(dir), before);
});
