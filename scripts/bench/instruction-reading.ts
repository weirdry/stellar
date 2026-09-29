// Controlled instructed paths, not host telemetry or model-token measurements.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  repo,
  fresh,
  option,
  options,
  join,
  writeJSON,
  usageError,
} from './common.ts';

const baseline = 'e76de76589ba914cd265d7f13ff4f8a16f176cef';
const outputPath = option(options(['output']), 'output');
try {
  execFileSync('git', ['cat-file', '-e', `${baseline}^{commit}`], {
    cwd: repo,
    stdio: 'ignore',
  });
} catch {
  usageError(
    `Baseline ${baseline} is unavailable; fetch its history before rerunning. No output directory was created.`,
  );
}
// Keep checkout provenance separate from the reproducible content receipt.
// Inspect status before creating output so this run does not dirty its own input.
const provenance = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repo,
    encoding: 'utf8',
  }).trim(),
  dirty:
    execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: repo,
      encoding: 'utf8',
    }).trim() !== '',
};
const output = fresh(outputPath);
type Reading = { path: string; section?: string; lines?: [number, number] };
const paths = (...names: string[]): Reading[] =>
  names.map((path) => ({ path }));
const oldCommon = paths(
  'SKILL.md',
  'schemas/README.md',
  'references/classification.md',
  'references/runs.md',
);
const common = paths(
  'SKILL.md',
  'references/runs.md',
  'references/continuity.md',
);
const collection = paths('references/collection.md', 'references/capture.md');
const scenarios: { name: string; before: Reading[]; after: Reading[] }[] = [
  {
    name: 'first-supplied-capture',
    before: [
      ...oldCommon,
      ...paths('references/capture.md', 'references/reading.md'),
      { path: 'references/continuity.md', section: 'Classify a first draft' },
      // The linked first-draft section refers to the example in this section.
      {
        path: 'references/continuity.md',
        section: "Apply a user's correction",
      },
      // Only domains are absent from that inline example. These exact lines
      // at the pinned baseline define domains, without unrelated source fields.
      { path: 'schemas/work-map.schema.json', lines: [39, 62] },
    ],
    after: [
      ...common,
      ...paths(
        'references/first-report.md',
        'references/choices.md',
        'references/classification.md',
        'references/reading.md',
      ),
      ...collection,
    ],
  },
  {
    name: 'remember-completed-map',
    before: [...oldCommon, ...paths('references/continuity.md')],
    after: [...common, ...paths('references/remember.md')],
  },
  {
    name: 'refresh-supplied-capture',
    before: [
      ...oldCommon,
      ...paths(
        'references/continuity.md',
        'references/capture.md',
        'references/reading.md',
      ),
    ],
    // Include the general reader conservatively, as in the explicit replay.
    after: [
      ...common,
      ...paths(
        'references/refresh.md',
        'references/choices.md',
        'references/refresh-reading.md',
        'references/classification.md',
        'references/reading.md',
      ),
      ...collection,
    ],
  },
  {
    name: 'revise-existing-group',
    before: [...oldCommon, ...paths('references/continuity.md')],
    after: [
      ...common,
      ...paths('references/revise.md', 'references/choices.md'),
    ],
  },
];
function load(reading: Reading, before: boolean) {
  const source = before
    ? execFileSync('git', ['show', `${baseline}:${reading.path}`], {
        cwd: repo,
        encoding: 'utf8',
      })
    : readFileSync(join(repo, reading.path), 'utf8');
  if (reading.lines) {
    const [start, end] = reading.lines;
    return (
      source
        .split('\n')
        .slice(start - 1, end)
        .join('\n') + '\n'
    );
  }
  if (!reading.section) return source;
  const marker = `## ${reading.section}\n`,
    start = source.indexOf(marker);
  if (start < 0) throw new Error(`Missing section: ${reading.path}`);
  const end = source.indexOf('\n## ', start + marker.length);
  return source.slice(start, end < 0 ? source.length : end);
}
const rows = scenarios.map(({ name, before, after }) => {
  const modes = (
    [
      ['before', before],
      ['after', after],
    ] as const
  ).map(([mode, readings]) => {
    const loaded = readings.map((reading) => ({
      ...reading,
      text: load(reading, mode === 'before'),
    }));
    // Inspectable exact loaded text; framing is not counted in content bytes.
    writeFileSync(
      join(output, `${name}-${mode}.md`),
      loaded
        .map(
          (r) =>
            `<!-- ${r.path}${r.section ? '#' + r.section : ''}${r.lines ? ':' + r.lines.join('-') : ''} -->\n${r.text}`,
        )
        .join('\n'),
    );
    const entries = loaded.map(({ text, ...reading }) => ({
      ...reading,
      bytes: Buffer.byteLength(text),
      sha256: createHash('sha256').update(text).digest('hex'),
    }));
    return {
      mode,
      entries,
      bytes: entries.reduce((sum, r) => sum + r.bytes, 0),
    };
  });
  return { name, modes };
});
const result = {
  baseline,
  method:
    'Explicit example-led reading paths, each unique document/section/excerpt loaded once per independent scenario. Supplied captures; no recovery, live provider or direct-map authoring branch. Both sides consult additional schema definitions only for fields absent from their inline example. Baseline first generation includes the first-classification section, its referenced correction/example section, and only the domain definition at pinned schema lines 39-62. Refresh and revise use existing taxonomy and their inline examples on both sides; neither is charged whole-schema reads. After follows operation routing; refresh conservatively includes the general reader. Embedded examples count as instructions; separate fixture data and executable output do not. This is a controlled selected-content comparison, not a mandatory minimum, automatic host tracing, actual model input/token usage, or autonomous task-quality evidence. Per-file hashes identify measured content; provenance.json separately records the after checkout HEAD and dirty status before output creation.',
  rows,
};
writeJSON(join(output, 'results.json'), result);
writeJSON(join(output, 'provenance.json'), provenance);
console.log(JSON.stringify(result, null, 2));
