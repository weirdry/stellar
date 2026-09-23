import { compileFromFile } from 'json-schema-to-typescript';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const names = ['capture', 'choices', 'state', 'work-map'];
const check = process.argv[2] === '--check';
if (process.argv.length > 3 || (process.argv[2] && !check))
  throw new Error('Usage: node scripts/types/declarations.ts [--check]');
const schemas = (await readdir(join(root, 'schemas')))
  .filter((name) => name.endsWith('.schema.json'))
  .sort();
if (
  JSON.stringify(schemas) !==
  JSON.stringify(names.map((name) => `${name}.schema.json`))
)
  throw new Error(
    'Schema inventory changed; update the declaration generator intentionally.',
  );

const generated = join(root, 'types/generated');
const artifacts = await Promise.all(
  names.map(
    async (name) =>
      [
        `${name}.d.ts`,
        await compileFromFile(join(root, 'schemas', `${name}.schema.json`), {
          unknownAny: true,
          ignoreMinAndMaxItems: true,
          enableConstEnums: false,
          bannerComment: '// Generated from canonical schemas; do not edit.',
          $refOptions: { resolve: { http: false } },
        }),
      ] as const,
  ),
);
const expected: string[] = artifacts.map(([name]) => name);
const existing = await readdir(generated).catch((error: unknown) => {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
    return [];
  throw error;
});
const unexpected = existing.filter((name) => !expected.includes(name));
if (unexpected.length)
  throw new Error(
    `Unexpected generated files: ${unexpected.join(', ')}. No files were written.`,
  );
if (!check) await mkdir(generated, { recursive: true });
for (const [name, content] of artifacts) {
  if (!check) await writeFile(join(generated, name), content);
  else {
    const actual = await readFile(join(generated, name), 'utf8').catch(
      (error: unknown) => {
        if (
          error instanceof Error &&
          'code' in error &&
          error.code === 'ENOENT'
        )
          return null;
        throw error;
      },
    );
    if (actual !== content) {
      console.error(
        `types/generated/${name} is stale or missing. Run just types-build.`,
      );
      process.exitCode = 1;
    }
  }
}
if (!process.exitCode)
  console.log(
    check
      ? 'Schema declarations are current.'
      : 'Schema declarations generated.',
  );
