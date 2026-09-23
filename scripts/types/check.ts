import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const configPath = join(root, 'tsconfig.json');
const config = ts.parseJsonText(configPath, readFileSync(configPath, 'utf8'));
const parsed = ts.parseJsonSourceFileConfigFileContent(config, ts.sys, root);
const program = ts.createProgram(parsed.fileNames, {
  ...parsed.options,
  noEmit: true,
  incremental: false,
});
const included = new Set(
  program.getSourceFiles().map((file) => resolve(file.fileName)),
);
const missing: string[] = [],
  legacy: string[] = [];
function visit(directory: string) {
  for (const entry of readdirSync(join(root, directory), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (path.endsWith('.ts') && !included.has(resolve(root, path)))
      missing.push(path);
    else if (
      /^(bin|lib)[/\\]/.test(path) &&
      /\.[cm]?js$/.test(path) &&
      path !== join('bin', 'stellar.mjs')
    )
      legacy.push(path);
  }
}
for (const directory of [
  'bin',
  'lib',
  'types/generated',
  'scripts/types',
  'test/types',
])
  visit(directory);
if (missing.length || legacy.length) {
  console.error(
    `Type coverage incomplete. Missing from compiler: ${missing.join(', ') || 'none'}. Handwritten core/CLI JS: ${legacy.join(', ') || 'none'}.`,
  );
  process.exitCode = 1;
}
const diagnostics = [
  ...ts.getConfigFileParsingDiagnostics(parsed),
  ...ts.getPreEmitDiagnostics(program),
];
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (file) => relative(root, file),
      getNewLine: () => '\n',
    }),
  );
  process.exitCode = 1;
}
if (!process.exitCode)
  console.log('Strict core/CLI type checking and source coverage passed.');
