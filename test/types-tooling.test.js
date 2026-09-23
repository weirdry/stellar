import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { sha256 } from '../lib/installation.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-types-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const path of [
    'bin',
    'lib',
    'schemas',
    'types',
    'scripts/types',
    'test/types',
    'package.json',
    'tsconfig.json',
    'eslint.config.js',
    '.prettierignore',
  ])
    await cp(join(root, path), join(dir, path), { recursive: true });
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  const run = (...args) =>
    spawnSync(process.execPath, args, { cwd: dir, encoding: 'utf8' });
  const write = (path, text) => writeFile(join(dir, path), text);
  const read = (path) => readFile(join(dir, path), 'utf8');
  return { dir, run, write, read };
}
async function snapshot(dir) {
  const result = {};
  async function visit(path) {
    for (const entry of await readdir(join(dir, path), {
      withFileTypes: true,
    })) {
      if (entry.name === 'node_modules') continue;
      const relative = join(path, entry.name);
      if (entry.isSymbolicLink())
        result[relative] = { symlink: await readlink(join(dir, relative)) };
      else if (entry.isDirectory()) await visit(relative);
      else result[relative] = sha256(await readFile(join(dir, relative)));
    }
  }
  await visit('');
  return result;
}
function success(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
}
async function readOnlyFailure(dir, run, args, message) {
  const before = await snapshot(dir);
  const result = run(...args);
  assert.equal(result.status, 1, result.stderr + result.stdout);
  assert.match(result.stderr + result.stdout, message);
  assert.deepEqual(await snapshot(dir), before);
}

test('type checking reports config syntax and option errors without writing and accepts JSONC', async (t) => {
  const { dir, run, write, read } = await fixture(t);
  const check = ['scripts/types/check.ts'];
  const config = await read('tsconfig.json');
  for (const malformed of [
    config.trimEnd().slice(0, -1),
    config.replace('"target": "ES2024",', '"target": "ES2024"'),
  ]) {
    await write('tsconfig.json', malformed);
    await readOnlyFailure(dir, run, check, /tsconfig\.json[\s\S]*TS1005/);
  }
  await write('tsconfig.json', config.replace('"ES2024"', '"unknown-target"'));
  await readOnlyFailure(dir, run, check, /Argument for '--target' option/);
  await write(
    'tsconfig.json',
    '// JSONC comments and trailing commas\n' +
      config.replace(/}\s*$/, ',\n}\n'),
  );
  const before = await snapshot(dir);
  success(run(...check));
  assert.deepEqual(await snapshot(dir), before);
});

test('strict program checks unimported files, declaration bodies and the complete owned inventory without writing', async (t) => {
  const { dir, run, write, read } = await fixture(t);
  const check = ['scripts/types/check.ts'];
  const before = await snapshot(dir);
  success(run(...check));
  assert.deepEqual(await snapshot(dir), before);
  await write('bin/unimported.ts', 'export const value: string = 42;\n');
  await readOnlyFailure(dir, run, check, /not assignable to type 'string'/);
  await write('bin/unimported.ts', 'export const value: string = "checked";\n');
  success(run(...check));
  const config = await read('tsconfig.json');
  await write(
    'tsconfig.json',
    JSON.stringify({ ...JSON.parse(config), exclude: ['bin/unimported.ts'] }),
  );
  await readOnlyFailure(
    dir,
    run,
    check,
    /Missing from compiler: bin\/unimported.ts/,
  );
  await write('tsconfig.json', config);
  await write('lib/unchecked.js', 'export const value = 1;\n');
  await readOnlyFailure(
    dir,
    run,
    check,
    /Handwritten core\/CLI JS: lib\/unchecked.js/,
  );
  await rm(join(dir, 'lib/unchecked.js'));
  const declaration = await read('types/generated/work-map.d.ts');
  await write(
    'types/generated/work-map.d.ts',
    declaration + '\nexport type Broken = UndeclaredType;\n',
  );
  await readOnlyFailure(dir, run, check, /Cannot find name 'UndeclaredType'/);
  await write('types/generated/work-map.d.ts', declaration);
  const contract = await read('test/types/contracts.ts');
  await write(
    'test/types/contracts.ts',
    contract.replace(
      "WorkMap['schemaVersion'] = 2",
      "WorkMap['schemaVersion'] = 1",
    ),
  );
  await readOnlyFailure(dir, run, check, /Unused '@ts-expect-error'/);
});

test('declaration currency and inventory drift fail without repair; explicit generation is deterministic', async (t) => {
  const { dir, run, write, read } = await fixture(t);
  const check = ['scripts/types/declarations.ts', '--check'];
  const before = await snapshot(dir);
  success(run(...check));
  assert.deepEqual(await snapshot(dir), before);
  success(run('scripts/types/declarations.ts'));
  assert.deepEqual(await snapshot(dir), before);
  const declaration = await read('types/generated/work-map.d.ts');
  await write('types/generated/work-map.d.ts', declaration + '// drift\n');
  await readOnlyFailure(dir, run, check, /is stale or missing/);
  await rm(join(dir, 'types/generated/work-map.d.ts'));
  await readOnlyFailure(dir, run, check, /is stale or missing/);
  await write('types/generated/work-map.d.ts', declaration);
  await write('types/generated/extra.d.ts', 'export type Extra = string;\n');
  await readOnlyFailure(dir, run, check, /Unexpected generated files/);
  await readOnlyFailure(
    dir,
    run,
    ['scripts/types/declarations.ts'],
    /Unexpected generated files/,
  );
  await rm(join(dir, 'types/generated/extra.d.ts'));
  await write('schemas/extra.schema.json', '{}');
  await readOnlyFailure(dir, run, check, /Schema inventory changed/);
  await rm(join(dir, 'schemas/extra.schema.json'));
  await rm(join(dir, 'schemas/choices.schema.json'));
  await readOnlyFailure(dir, run, check, /Schema inventory changed/);
});

test('declaration inventories ignore hidden metadata but still reject real drift before writing', async (t) => {
  const { dir, run, write } = await fixture(t);
  for (const directory of ['schemas', 'types/generated']) {
    await write(`${directory}/.DS_Store`, 'synthetic OS metadata');
    await mkdir(join(dir, directory, '.cache'));
    await write(`${directory}/.cache/extra.schema.json`, '{}');
    await write(`${directory}/.cache/extra.d.ts`, 'synthetic cache');
  }
  await write('schemas/._work-map.schema.json', 'synthetic OS metadata');
  await write('types/generated/._work-map.d.ts', 'synthetic OS metadata');
  await symlink(
    'missing-editor-lock',
    join(dir, 'schemas/.#work-map.schema.json'),
  );
  await symlink(
    'missing-editor-lock',
    join(dir, 'types/generated/.#work-map.d.ts'),
  );
  const beforeTypecheck = await snapshot(dir);
  success(run('scripts/types/check.ts'));
  assert.deepEqual(await snapshot(dir), beforeTypecheck);
  for (const args of [
    ['scripts/types/declarations.ts', '--check'],
    ['scripts/types/declarations.ts'],
  ]) {
    const before = await snapshot(dir);
    success(run(...args));
    assert.deepEqual(await snapshot(dir), before);
    for (const [path, contents, message] of [
      ['schemas/extra.schema.json', '{}', /Schema inventory changed/],
      [
        'types/generated/extra.d.ts',
        'export type Extra = string;',
        /Unexpected generated files/,
      ],
    ]) {
      await write(path, contents);
      await readOnlyFailure(dir, run, args, message);
      await rm(join(dir, path));
    }
    await rm(join(dir, 'schemas/choices.schema.json'));
    await readOnlyFailure(dir, run, args, /Schema inventory changed/);
    await cp(
      join(root, 'schemas/choices.schema.json'),
      join(dir, 'schemas/choices.schema.json'),
    );
  }
});

test('type-aware lint rejects unsafe escapes; repository formatting preserves generated declarations', async (t) => {
  const { dir, run, write } = await fixture(t);
  const lint = ['node_modules/eslint/bin/eslint.js', 'lib/unsafe.ts'];
  await write(
    'lib/unsafe.ts',
    `export function unchecked(value: unknown) {
  // @ts-ignore
  const hidden: any = value;
  return (hidden as unknown as { name: string }).name!;
}\n`,
  );
  await readOnlyFailure(dir, run, lint, /@typescript-eslint\/no-explicit-any/);
  const diagnostic = run(...lint).stdout;
  for (const rule of [
    'ban-ts-comment',
    'no-non-null-assertion',
    'no-restricted-syntax',
  ])
    assert.ok(diagnostic.includes(rule), diagnostic);
  await write(
    'lib/unsafe.ts',
    'export function unchecked(value: string) { return JSON.parse(value).name; }\n',
  );
  await readOnlyFailure(dir, run, lint, /no-unsafe-member-access/);
  await rm(join(dir, 'lib/unsafe.ts'));
  await mkdir(join(dir, 'test/types'), { recursive: true });
  await write(
    'test/types/format.ts',
    'export const value={name:"formatted"}\n',
  );
  const declarations = await snapshot(join(dir, 'types/generated'));
  success(run('node_modules/prettier/bin/prettier.cjs', '--write', '.'));
  assert.deepEqual(await snapshot(join(dir, 'types/generated')), declarations);
  assert.match(
    await readFile(join(dir, 'test/types/format.ts'), 'utf8'),
    /value = \{/,
  );
  success(run('scripts/types/declarations.ts', '--check'));
});
