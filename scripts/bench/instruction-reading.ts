// Controlled instructed paths, not host telemetry or model-token measurements.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { repo, fresh, option, options, join, writeJSON } from './common.ts';

const baseline = 'e76de76589ba914cd265d7f13ff4f8a16f176cef';
const output = fresh(option(options(['output']), 'output'));
type Reading = { path: string; section?: string };
const paths = (...names: string[]): Reading[] =>
  names.map((path) => ({ path }));
const oldCommon = paths(
  'SKILL.md',
  'schemas/README.md',
  'references/classification.md',
  'references/runs.md',
);
// The old decision-authoring instructions require the choices contract; its
// domain/category/issue definitions reference the work-map schema. Count both
// complete files for these selected baseline paths, but not for unchanged maps.
const oldChoices = paths(
  'schemas/choices.schema.json',
  'schemas/work-map.schema.json',
);
const common = paths(
  'SKILL.md',
  'references/runs.md',
  'references/continuity.md',
);
const collection = paths('references/collection.md', 'references/capture.md');
const scenarios = [
  {
    name: 'first-supplied-capture',
    before: [
      ...oldCommon,
      ...paths('references/capture.md', 'references/reading.md'),
      { path: 'references/continuity.md', section: 'Classify a first draft' },
      ...oldChoices,
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
      ...oldChoices,
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
    before: [...oldCommon, ...paths('references/continuity.md'), ...oldChoices],
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
            `<!-- ${r.path}${r.section ? '#' + r.section : ''} -->\n${r.text}`,
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
    'Explicit selected reading paths, each unique document/section loaded once per independent scenario. Supplied captures; no recovery, live provider or direct-map authoring branch. Before follows mandatory read instructions, using only the anchored first-classification section for first generation, plus the full choices and referenced work-map schemas when authoring decisions. After follows operation routing; refresh conservatively includes the general reader. Revised choices fit the inline contract, including domains for first generation; data/examples and executable output are not instruction bytes. Schema files are counted in full on the selected baseline paths, not as a claim that every host reads whole files. This is a controlled document-load comparison, not automatic host tracing, actual model input/token usage, or autonomous task-quality evidence.',
  rows,
};
writeJSON(join(output, 'results.json'), result);
console.log(JSON.stringify(result, null, 2));
