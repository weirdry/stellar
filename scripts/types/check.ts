import ts from 'typescript';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const included = new Set<string>(),
  shims = new Set<string>();
const diagnostics: ts.Diagnostic[] = [];
for (const name of [
  'tsconfig.json',
  'tsconfig.viewer.json',
  'tsconfig.browser-tests.json',
]) {
  const path = join(root, name),
    config = ts.parseJsonText(path, readFileSync(path, 'utf8'));
  const parsed = ts.parseJsonSourceFileConfigFileContent(config, ts.sys, root);
  const program = ts.createProgram(parsed.fileNames, {
    ...parsed.options,
    noEmit: true,
    incremental: false,
  });
  diagnostics.push(
    ...ts.getConfigFileParsingDiagnostics(parsed),
    ...ts.getPreEmitDiagnostics(program),
  );
  for (const file of program.getSourceFiles()) {
    included.add(resolve(file.fileName));
    const path = relative(root, file.fileName);
    if (
      file.isDeclarationFile &&
      /^(bin|lib|viewer|scripts|test)[/\\]/.test(path)
    )
      shims.add(path);
  }
}
// These JS sources belong to archived experiments, not the maintained runtime.
const exceptions = new Set([
  'bin/stellar.mjs',
  'assets/viewer/app.js',
  'scripts/bench/native/bridge.mjs',
  'scripts/bench/native/cases.mjs',
  'scripts/bench/native/stage.mjs',
  'scripts/bench/standalone/build-focused.mjs',
  'scripts/bench/standalone/cases.mjs',
  'scripts/bench/standalone/focused-entry.mjs',
  'scripts/bench/native/compare.py',
  'scripts/bench/standalone/check_archive.py',
  'scripts/bench/standalone/benchmark.py',
  'scripts/bench/standalone/differential.py',
  'scripts/bench/standalone/safety.py',
  'scripts/bench/standalone/replay.py',
  'scripts/bench/standalone/test_checks.py',
]);
const missing: string[] = [],
  legacy: string[] = [];
function check(path: string) {
  if (/\.[cm]?ts$/.test(path) && !included.has(resolve(root, path)))
    missing.push(path);
  else if (/\.(?:[cm]?js|py)$/.test(path) && !exceptions.has(path))
    legacy.push(path);
}
function visit(directory: string) {
  for (const entry of readdirSync(join(root, directory), {
    withFileTypes: true,
  })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else check(path);
  }
}
for (const directory of [
  'bin',
  'lib',
  'viewer',
  'types/generated',
  'scripts',
  'test',
  'assets/viewer',
])
  visit(directory);
for (const entry of readdirSync(root, { withFileTypes: true }))
  if (entry.isFile()) check(entry.name);
if (missing.length || legacy.length || shims.size) {
  console.error(
    `Type coverage incomplete. Missing from compiler: ${missing.join(', ') || 'none'}. Handwritten maintained JS/Python: ${legacy.join(', ') || 'none'}. Implementation declaration shims: ${[...shims].join(', ') || 'none'}.`,
  );
  process.exitCode = 1;
}
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
  console.log(
    'Strict Node, viewer and browser-test type checking and maintained-source coverage passed.',
  );
