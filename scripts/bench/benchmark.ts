// Optional synthetic measurements. No timing threshold belongs in CI.
import { mkdirSync, rmSync } from 'node:fs';
import { record, errorMessage } from '../support/values.ts';
import {
  child,
  digest,
  directory,
  environment,
  fresh,
  hashes,
  isDeepStrictEqual,
  join,
  json,
  listArtifacts,
  measure,
  measurementProtocol,
  median,
  operation,
  option,
  options,
  positive,
  random,
  relative,
  repo,
  shuffle,
  stageRuntime,
  usageError,
  writeJSON,
} from './common.ts';
import type { Measurement } from './common.ts';

const args = options(['node', 'output', 'reference', 'sizes', 'trials'], {
  sizes: '1000,10000,50000',
  trials: '3',
});
const node = option(args, 'node'),
  output = option(args, 'output'),
  trials = positive(option(args, 'trials'));
const sizeText = typeof args['sizes'] === 'string' ? args['sizes'] : '';
if (!/^\d+(,\d+)*$/.test(sizeText))
  usageError('Sizes must be a comma-separated list of integers.');
const sizes = sizeText.split(',').map(Number);
if (
  new Set(sizes).size !== sizes.length ||
  sizes.some((n) => !Number.isSafeInteger(n) || n < 100 || n % 20)
)
  usageError('Requires distinct sizes >=100 divisible by 20.');
const protocol = {
  sizes,
  trials,
  fixture: digest(join(directory, 'fixtures.ts')),
};
let reference: Record<string, string> | undefined;
if (args['reference'] !== undefined) {
  try {
    const prior = record(json(option(args, 'reference')));
    reference = hashes(prior['artifacts']);
    if (!isDeepStrictEqual(prior['protocol'], protocol))
      usageError(
        'Reference protocol differs (sizes, trials or fixture source).',
      );
  } catch {
    usageError(
      'Reference must contain protocol and nonempty artifacts objects in a readable UTF-8 JSON results file.',
    );
  }
}
const root = fresh(output);
mkdirSync(join(root, 'data'));
mkdirSync(join(root, 'runs'));
const { stage, files, version } = stageRuntime(root);
const rows: ({
  size: number;
  operation: string;
  trial: number;
} & Measurement)[] = [];
const receipts: { size: number; kind: string; checks: unknown }[] = [],
  fingerprints: Record<string, string> = {};
function invoke(command: string[], tag: string): [Measurement, unknown] {
  const paths = {
    stdout: join(root, 'runs', `${tag}.stdout`),
    stderr: join(root, 'runs', `${tag}.stderr`),
    resources: join(root, 'runs', `${tag}.resources`),
  };
  const measured = measure(
    node,
    [join(stage, 'bin/stellar.mjs'), ...command],
    paths,
  );
  const result = json(paths.stdout);
  for (const file of Object.values(paths)) rmSync(file);
  return [measured, result];
}
function fixture(...args: string[]) {
  child(node, [join(directory, 'fixtures.ts'), ...args]);
}
function fingerprint(name: string, path: string) {
  const actual = digest(path);
  if (reference !== undefined && reference[name] !== actual)
    throw new Error(`Reference artifact differs: ${name}`);
  fingerprints[name] = actual;
}
function verify(size: number, run: string, capture: string, label: string) {
  const [, value] = invoke(
    [
      'verify-run',
      capture,
      join(run, 'work-map.json'),
      join(run, 'stellar.html'),
      join(run, 'state.json'),
    ],
    `${size}-${label}-verify`,
  );
  const result = record(value),
    expected = Object.fromEntries(
      ['captureFacts', 'embeddedMap', 'bundledViewer', 'stateMap'].map(
        (name) => [name, 'pass'],
      ),
    );
  if (!result['valid'] || !isDeepStrictEqual(result['checks'], expected))
    throw new Error(`Failed verification: ${JSON.stringify(result)}`);
  receipts.push({ size, kind: label, checks: result['checks'] });
}
try {
  fixture('generate', join(root, 'data'), sizeText);
  for (const size of sizes) {
    const data = join(root, 'data', String(size));
    for (const mode of ['initial', 'steady', 'churn'])
      fingerprint(
        `${size}/${mode}-capture.json`,
        join(data, `${mode}-capture.json`),
      );
    invoke(
      [
        'normalize',
        join(data, 'initial-capture.json'),
        join(data, 'draft.json'),
      ],
      `${size}-setup-normalize`,
    );
    fixture('author', join(data, 'draft.json'), join(data, 'initial-map.json'));
    invoke(
      ['remember', join(data, 'initial-map.json'), join(data, 'prior')],
      `${size}-setup-remember`,
    );
    invoke(
      [
        'refresh',
        join(data, 'prior/state.json'),
        join(data, 'steady-capture.json'),
        join(data, 'steady'),
      ],
      `${size}-setup-refresh`,
    );
    invoke(
      [
        'render',
        join(data, 'steady/work-map.json'),
        join(data, 'steady/stellar.html'),
      ],
      `${size}-setup-render`,
    );
    fixture(
      'continuity',
      join(data, 'prior/state.json'),
      join(data, 'steady/state.json'),
    );
    verify(
      size,
      join(data, 'steady'),
      join(data, 'steady-capture.json'),
      'steady',
    );
    const operations = ['normalize', 'refresh', 'render'];
    if (size <= 10000) {
      invoke(
        [
          'refresh',
          join(data, 'prior/state.json'),
          join(data, 'churn-capture.json'),
          join(data, 'churn'),
        ],
        `${size}-churn-refresh`,
      );
      fixture(
        'choices',
        join(data, 'churn/state.json'),
        join(data, 'choices.json'),
      );
      invoke(
        [
          'classify',
          join(data, 'churn/state.json'),
          join(data, 'choices.json'),
          join(data, 'reviewed'),
        ],
        `${size}-churn-classify`,
      );
      invoke(
        [
          'render',
          join(data, 'reviewed/work-map.json'),
          join(data, 'reviewed/stellar.html'),
        ],
        `${size}-churn-render`,
      );
      fixture(
        'continuity',
        join(data, 'prior/state.json'),
        join(data, 'reviewed/state.json'),
      );
      verify(
        size,
        join(data, 'reviewed'),
        join(data, 'churn-capture.json'),
        'churn',
      );
      operations.push('classify');
    }
    for (const file of listArtifacts(data))
      fingerprint(relative(join(root, 'data'), file), file);
    const next = random(20260920n + BigInt(size));
    for (let trial = 0; trial < trials; trial++) {
      shuffle(operations, next);
      for (const name of operations) {
        const tag = `${size}-${name}-${trial}`,
          dest = join(root, 'runs', tag);
        const { command, pairs } = operation(size, name, root, dest),
          [measurement] = invoke(command, tag);
        for (const [actual, expected] of pairs)
          if (digest(actual) !== digest(expected))
            throw new Error(`Non-deterministic output: ${tag}`);
        rows.push({ size, operation: name, trial, ...measurement });
        console.log(
          `${tag}: ${measurement.wall_ms.toFixed(2)} ms, ${measurement.peak_rss_mib.toFixed(2)} MiB`,
        );
        rmSync(dest, { recursive: true });
      }
    }
  }
  if (
    reference &&
    !isDeepStrictEqual(
      Object.keys(fingerprints).sort(),
      Object.keys(reference).sort(),
    )
  )
    throw new Error('Reference artifact inventory differs.');
  const summary = sizes.flatMap((size) =>
    ['normalize', 'refresh', 'render', 'classify'].flatMap((operation) => {
      const samples = rows.filter(
        (row) => row.size === size && row.operation === operation,
      );
      if (!samples.length) return [];
      const wall = samples.map((row) => row.wall_ms);
      return [
        {
          size,
          operation,
          median_ms: median(wall),
          min_ms: Math.min(...wall),
          max_ms: Math.max(...wall),
          peak_rss_mib: median(samples.map((row) => row.peak_rss_mib)),
        },
      ];
    }),
  );
  writeJSON(join(root, 'results.json'), {
    protocol,
    measurement: measurementProtocol,
    ordering: {
      algorithm: 'python-mt19937-fisher-yates',
      seed: '20260920 + size',
      serial_execution: true,
    },
    environment: environment(node),
    revision: child('git', ['rev-parse', 'HEAD'], repo).trim(),
    runtime_files: files,
    runner_version: version,
    harness: Object.fromEntries(
      [
        'benchmark.ts',
        'fixtures.ts',
        'common.ts',
        'random.ts',
        '../support/values.ts',
      ].map((name) => [name, digest(join(directory, name))]),
    ),
    reference_matched: reference !== undefined,
    artifacts: fingerprints,
    rows,
    summary,
    receipts,
  });
  console.log(
    `Passed ${rows.length} timed output comparisons and ${receipts.length} four-part verification receipts. Results: ${join(root, 'results.json')}`,
  );
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
