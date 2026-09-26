// Repository-owned canonical documentation contract.
// Policy: docs/development/documentation.md.
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const profileId = 'stellar-arc42-v1';
const usage = `Usage:
  check-contract.ts [--target PATH]

Options:
  --target PATH  Repository or engineering-layer root to validate.
  -h, --help     Show this help.`;
let target = process.cwd();
function usageError(message: string): never {
  console.error(`error: ${message}\n${usage}`);
  process.exit(2);
}
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  const arg = args[index];
  if (arg === '-h' || arg === '--help') {
    console.log(usage);
    process.exit(0);
  }
  if (arg !== '--target') usageError(`unknown option: ${arg}`);
  const value = args[++index];
  if (!value) usageError('--target requires a value');
  target = value;
}
if (!existsSync(target) || !statSync(target).isDirectory())
  usageError(`target directory does not exist: ${target}`);
const root = realpathSync(target);
let errors = 0;
function report(message: string) {
  console.error(`error: ${message}`);
  errors++;
}
function read(path: string): string | undefined {
  const absolute = join(root, path);
  return existsSync(absolute) && statSync(absolute).isFile()
    ? readFileSync(absolute, 'utf8')
    : undefined;
}
const chapters = [
  'README.md',
  '01-introduction-goals.md',
  '02-constraints.md',
  '03-context-scope.md',
  '04-solution-strategy.md',
  '05-building-block-view.md',
  '06-runtime-view.md',
  '07-deployment-view.md',
  '08-crosscutting-concepts.md',
  '09-architecture-decisions.md',
  '10-quality.md',
  '11-risks-technical-debt.md',
  '12-glossary.md',
];
for (const path of [
  'docs/README.md',
  'docs/decisions/README.md',
  'docs/development/documentation.md',
  'docs/architecture/diagrams/README.md',
  'docs/architecture/diagrams/manifest.json',
])
  if (!read(path))
    report(`required documentation file missing or empty: ${path}`);
for (const name of chapters)
  if (!read(`docs/architecture/${name}`))
    report(
      `required architecture file missing or empty: docs/architecture/${name}`,
    );
const architectureIndex = read('docs/architecture/README.md');
if (architectureIndex !== undefined) {
  if (!architectureIndex.includes('Authority: **Canonical**'))
    report('docs/architecture/README.md must declare canonical authority');
  if (!/^Scope: \*\*.+\*\*$/m.test(architectureIndex))
    report('docs/architecture/README.md must declare a non-empty Scope');
  if (!architectureIndex.includes(`Documentation profile: **${profileId}**`))
    report(`docs/architecture/README.md must adopt ${profileId}`);
}
for (const name of chapters.slice(1)) {
  const text = read(`docs/architecture/${name}`);
  if (
    text !== undefined &&
    !/^State: \*\*(As-built|Target|Open|Deprecated)\*\*$/m.test(text)
  )
    report(
      `architecture chapter has no recognized default State: docs/architecture/${name}`,
    );
  if (architectureIndex !== undefined && !architectureIndex.includes(name))
    report(`architecture chapter is not indexed: docs/architecture/${name}`);
}
const decisionsIndex = read('docs/decisions/README.md');
const decisionsChapter = read('docs/architecture/09-architecture-decisions.md');
const decisionDirectory = join(root, 'docs/decisions');
const decisions =
  existsSync(decisionDirectory) && statSync(decisionDirectory).isDirectory()
    ? readdirSync(decisionDirectory).filter((name) =>
        /^\d{4}-.*\.md$/.test(name),
      )
    : [];
if (!decisions.length)
  report('at least one indexed architecture decision is required');
for (const name of decisions) {
  if (
    !/^(- )?Status: \*{0,2}(Proposed|Accepted|Superseded|Deprecated|Rejected)\*{0,2}$/m.test(
      read(`docs/decisions/${name}`) ?? '',
    )
  )
    report(`ADR has no recognized lifecycle status: docs/decisions/${name}`);
  if (decisionsIndex !== undefined && !decisionsIndex.includes(name))
    report(`ADR is missing from docs/decisions/README.md: ${name}`);
  if (decisionsChapter !== undefined && !decisionsChapter.includes(name))
    report(`ADR is missing from architecture chapter 9: ${name}`);
}
const skipped = new Set([
  '.git',
  '.cache',
  'local',
  'outputs',
  'node_modules',
  '.venv',
  'dist',
  'coverage',
]);
function visit(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!skipped.has(entry.name)) visit(file);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const text = readFileSync(file, 'utf8'),
      display = relative(root, file);
    if (/[\t ]+$/m.test(text)) report(`trailing whitespace: ${display}`);
    if (/\{\{[A-Z_][A-Z_]*\}\}/.test(text))
      report(`unresolved scaffold token: ${display}`);
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const destination = match[1];
      if (!destination || /^(https?:\/\/|mailto:|#)/.test(destination))
        continue;
      const path = destination
        .split('#')[0]
        ?.split('?')[0]
        ?.replace(/^</, '')
        .replace(/>$/, '');
      if (!path) continue;
      const resolved = path.startsWith('/')
        ? root + path
        : resolve(dirname(file), path);
      if (!existsSync(resolved))
        report(`broken local Markdown link in ${display}: ${destination}`);
    }
  }
}
visit(root);
if (errors) {
  console.error(`arc42 contract check: FAILED (${errors} problem(s))`);
  process.exitCode = 1;
} else console.log(`arc42 contract check: OK (${profileId})`);
