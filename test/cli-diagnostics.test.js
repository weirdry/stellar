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
import { errorSummary } from '../lib/cli-diagnostics.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function setup(t, complete = true) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-diagnostics-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const installed = join(dir, "installed skill's copy");
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
      const short = run([command, '-h'], cli);
      assert.equal(short.status, 0, short.stderr);
      assert.equal(short.stdout, a.stdout);
      assert.equal(short.stderr, '');
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
    const short = run(['-h'], cli);
    assert.equal(short.status, 0, short.stderr);
    assert.equal(short.stdout, global.stdout);
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
    ['-h', 'render'],
    ['-h', '--help'],
    ['help', '-h', 'extra'],
    ['--version', 'extra'],
    ['-V', '--json'],
    ['doctor', '--fix'],
    ['doctor', '--json', 'extra'],
    ['render'],
    ['validate', 'missing.json', 'extra'],
    ['normalize', ''],
    ['help', 'render', 'extra'],
    ['render', 'missing.json', '--help'],
    ['render', '--help', 'out.html'],
    ['render', 'missing.json', '-h'],
    ['normalize', 'missing.json', '-h'],
    ['search-issue', 'missing.json', 'ISSUE', '--help', '--help'],
    ['search-issue', 'missing.json', 'ISSUE', '--help', '-h'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /for usage/);
    assert.ok(!result.stderr.includes('ENOENT'));
  }
  assert.deepEqual(await snapshot(dir), before);
});

test('mixed help requests cannot create or overwrite outputs with valid workflow inputs', async (t) => {
  const { dir, installed, work, run } = await setup(t);
  for (const [source, target] of [
    ['museum.json', 'map.json'],
    ['mixed-capture.json', 'capture.json'],
    ['mixed-choices.json', 'choices.json'],
  ])
    await cp(join(root, 'examples', source), join(work, target));
  for (const args of [
    ['normalize', 'capture.json', 'draft.json'],
    ['classify-draft', 'draft.json', 'choices.json', 'first'],
  ]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
  }
  for (const existing of [false, true]) {
    if (existing)
      for (const flag of ['--help', '-h'])
        await writeFile(join(work, flag), 'KEEP EXISTING OUTPUT');
    const before = await snapshot(dir);
    for (const cli of [
      join(root, 'bin/stellar.js'),
      join(installed, 'bin/stellar.mjs'),
    ]) {
      for (const args of [
        ['render', 'map.json', '--help'],
        ['render', '--help', 'out.html'],
        ['normalize', 'capture.json', '--help'],
        ['retain-response', 'capture.json', '--help'],
        ['classify-draft', 'draft.json', 'choices.json', '--help'],
        ['remember', 'map.json', '--help'],
        ['refresh', 'first/state.json', 'capture.json', '--help'],
        ['classify', 'first/state.json', 'choices.json', '--help'],
        ['revise', 'first/state.json', 'choices.json', '--help'],
        ['inspect', 'map.json', '--help'],
        ['read-issue', 'map.json', 'MUS-1', '--help'],
        ['verify-run', 'capture.json', 'map.json', '--help'],
        ['doctor', '--json', '--help'],
      ]) {
        for (const flag of ['--help', '-h']) {
          const invocation = args.map((arg) => (arg === '--help' ? flag : arg));
          const result = run(invocation, cli);
          assert.equal(result.status, 2, JSON.stringify(invocation));
          assert.equal(result.stdout, '');
          assert.match(result.stderr, /cannot be combined/);
        }
      }
    }
    assert.deepEqual(await snapshot(dir), before);
  }
});

test('search-issue preserves help flags as literal text and explicit relative paths remain usable', async (t) => {
  const { dir, installed, work, run } = await setup(t);
  const map = JSON.parse(
    await readFile(join(root, 'examples/museum.json'), 'utf8'),
  );
  map.issues[0].description = 'Read --help or -h before starting.';
  await writeFile(join(work, 'map.json'), JSON.stringify(map));
  const before = await snapshot(dir);
  for (const cli of [
    join(root, 'bin/stellar.js'),
    join(installed, 'bin/stellar.mjs'),
  ]) {
    for (const offset of [[], ['0']]) {
      for (const flag of ['--help', '-h']) {
        const result = run(
          ['search-issue', 'map.json', map.issues[0].id, flag, ...offset],
          cli,
        );
        assert.equal(result.status, 0, result.stderr);
        // Literal "-h" also occurs within "--help".
        assert.equal(JSON.parse(result.stdout).total, flag === '-h' ? 2 : 1);
      }
    }
  }
  assert.deepEqual(await snapshot(dir), before);
  for (const flag of ['--help', '-h']) {
    const explicit = run(['render', 'map.json', `./${flag}`]);
    assert.equal(explicit.status, 0, explicit.stderr);
    assert.match(await readFile(join(work, flag), 'utf8'), /<!doctype html>/i);
  }
});

test(
  'usage pointers execute without a PATH launcher, including paths with spaces and quotes',
  { skip: process.platform === 'win32' },
  async (t) => {
    const { installed, work, run } = await setup(t, false);
    for (const cli of [
      join(root, 'bin/stellar.js'),
      join(installed, 'bin/stellar.mjs'),
    ]) {
      const bad = run(['render'], cli);
      assert.equal(bad.status, 2);
      const pointer = bad.stderr.match(/Run (.+) for usage\./)?.[1];
      assert.ok(pointer);
      const result = spawnSync('/bin/sh', ['-c', pointer], {
        cwd: work,
        env: {},
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, run(['help', 'render'], cli).stdout);
      assert.ok(!result.stdout.includes('Usage: stellar '));
      assert.ok(!result.stdout.includes('Run stellar '));
    }
    assert.deepEqual(await readdir(work), []);
  },
);

test('runtime load diagnostics retain a safe cause and location when doctor passes', async (t) => {
  const { installed, run } = await setup(t);
  for (const path of ['lib', 'bin/stellar.js', 'package.json'])
    await cp(join(root, path), join(installed, path), { recursive: true });
  await symlink(join(root, 'node_modules'), join(installed, 'node_modules'));
  const reader = join(installed, 'lib/reading.js');
  const original = await readFile(reader, 'utf8');
  await writeFile(
    reader,
    'const broken = undefinedValue.property;\n' + original,
  );
  const cli = join(installed, 'bin/stellar.js');
  const result = run(['inspect', 'not-read.json'], cli);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /ReferenceError at lib\/reading.js:1:\d+/);
  assert.match(result.stderr, /If doctor passes, investigate/);
  assert.match(
    result.stderr,
    /not runtime execution or current checkout source/,
  );
  const doctor = run(['doctor', '--json'], cli);
  assert.equal(doctor.status, 0, doctor.stderr);
  assert.equal(JSON.parse(doctor.stdout).ok, true);
  await writeFile(reader, original);
  const schemaPath = join(installed, 'schemas/work-map.schema.json');
  for (const content of [
    '{ "PRIVATE_SCHEMA_SENTINEL":',
    JSON.stringify({ type: 'PRIVATE_SCHEMA_SENTINEL' }),
  ]) {
    await writeFile(schemaPath, content);
    for (const entry of [cli, join(installed, 'bin/stellar.mjs')]) {
      const broken = run(['inspect', 'not-read.json'], entry);
      assert.equal(broken.status, 1);
      assert.match(broken.stderr, /could not load its runtime/);
      assert.match(
        broken.stderr,
        /(?:bin\/stellar.mjs|lib\/validate.js):\d+:\d+/,
      );
      assert.ok(!broken.stderr.includes('PRIVATE_SCHEMA_SENTINEL'));
    }
  }
});

test('safe error summaries omit multiline messages and forged stack frames', () => {
  const secret = 'PRIVATE_ERROR_SENTINEL';
  const message = `${secret}\n    at ${new URL(`../lib/${secret}.js:1:1`, import.meta.url).href}`;
  for (const error of [
    new SyntaxError(message),
    new Error(message),
    new ReferenceError(message),
  ])
    assert.ok(!errorSummary(error).includes(secret));
});
