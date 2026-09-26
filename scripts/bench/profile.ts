// Attribution runs separately from uninstrumented benchmark timings.
import { mkdirSync } from 'node:fs';
import { array, record, required, errorMessage } from '../support/values.ts';
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
  measure,
  measurementProtocol,
  operation,
  option,
  options,
  positive,
  random,
  relative,
  repo,
  resolve,
  shuffle,
  usageError,
  verifyFiles,
  writeJSON,
} from './common.ts';
import { compact, cpuSummary, heapSummary } from './profile-analysis.ts';

const args = options(['node', 'benchmark', 'output', 'trials'], {
  trials: '3',
});
const node = option(args, 'node'),
  benchmark = resolve(option(args, 'benchmark')),
  outputPath = option(args, 'output'),
  trials = positive(option(args, 'trials'));
const stage = join(benchmark, 'staged-skill'),
  script = join(directory, 'heap-sample.ts'),
  resultPath = join(benchmark, 'results.json');
try {
  const baseline = record(json(resultPath)),
    manifest = record(json(join(repo, 'bin/stellar.manifest.json'))),
    runtime = hashes(manifest['files']),
    artifacts = hashes(baseline['artifacts']),
    protocol = record(baseline['protocol']);
  if (!isDeepStrictEqual(baseline['runtime_files'], runtime))
    usageError('Benchmark runtime differs from this checkout.');
  if (protocol['fixture'] !== digest(join(directory, 'fixtures.ts')))
    usageError('Benchmark fixture source differs from this checkout.');
  verifyFiles(stage, runtime);
  verifyFiles(join(benchmark, 'data'), artifacts);
  const available = array(protocol['sizes']).map((size) => {
    if (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 100)
      throw new Error('Invalid benchmark sizes.');
    return size;
  });
  if (!available.length) usageError('Benchmark has no sizes.');
  const small = Math.min(...available),
    large = Math.max(...available);
  const selected = new Map<string, { size: number; operation: string }>();
  for (const [size, operation] of [
    [small, 'normalize'],
    [small, 'refresh'],
    [large, 'normalize'],
    [large, 'refresh'],
    [large, 'render'],
  ] as const)
    selected.set(`${size}:${operation}`, { size, operation });
  const choiceSizes = available.filter((n) => n <= 10000);
  if (choiceSizes.length) {
    const size = Math.max(...choiceSizes);
    selected.set(`${size}:classify`, { size, operation: 'classify' });
  }
  const cases = [...selected.values()].sort(
    (a, b) =>
      a.size - b.size ||
      (a.operation < b.operation ? -1 : a.operation > b.operation ? 1 : 0),
  );
  const sources = [
    'profile.ts',
    'profile-analysis.ts',
    'common.ts',
    'random.ts',
    'heap-sample.ts',
    '../support/values.ts',
  ];
  const toolHashes = Object.fromEntries(
      sources.map((name) => [name, digest(join(directory, name))]),
    ),
    baselineHash = digest(resultPath),
    output = fresh(outputPath);
  const runs = (['cpu', 'heap'] as const).flatMap((mode) =>
    Array.from({ length: trials }, (_, trial) =>
      cases.map((item) => ({ ...item, mode, trial })),
    ).flat(),
  );
  shuffle(runs, random(20260920));
  const rows = [];
  for (const { size, operation: name, mode, trial } of runs) {
    const tag = `${size}-${name}-${mode}-${trial}`,
      run = join(output, tag);
    mkdirSync(run);
    const dest = join(run, 'output'),
      { command, pairs } = operation(size, name, benchmark, dest),
      raw = join(run, mode === 'cpu' ? 'cpu.cpuprofile' : 'heap.json');
    const flags =
      mode === 'cpu'
        ? [
            `--cpu-prof-dir=${run}`,
            '--cpu-prof-name=cpu.cpuprofile',
            '--cpu-prof-interval=1000',
            '--cpu-prof',
          ]
        : ['--import', script];
    const measurement = measure(
      node,
      [...flags, join(stage, 'bin/stellar.mjs'), ...command],
      {
        stdout: join(run, 'stdout'),
        stderr: join(run, 'stderr'),
        resources: join(run, 'resources'),
      },
      {
        ...process.env,
        ...(mode === 'heap' ? { STELLAR_HEAP_PROFILE: raw } : {}),
      },
    );
    const comparisons: Record<string, string> = {};
    for (const [actual, expected] of pairs) {
      const actualHash = digest(actual),
        expectedHash = required(
          artifacts[relative(join(benchmark, 'data'), expected)],
        );
      if (actualHash !== expectedHash)
        throw new Error(`Profiled output differs: ${tag}`);
      comparisons[relative(run, actual)] = actualHash;
    }
    const summary =
      mode === 'cpu'
        ? cpuSummary(json(raw), stage, script)
        : heapSummary(json(raw), stage, script);
    rows.push({
      size,
      operation: name,
      mode,
      trial,
      instrumented_wall_ms: measurement.wall_ms,
      instrumented_cpu_ms: measurement.cpu_ms,
      instrumented_peak_rss_mib: measurement.peak_rss_mib,
      raw_profile_sha256: digest(raw),
      output_hashes: comparisons,
      ...compact(summary, mode),
    });
    console.log(`${tag}: output parity passed`);
  }
  if (
    digest(resultPath) !== baselineHash ||
    sources.some((name) => digest(join(directory, name)) !== toolHashes[name])
  )
    throw new Error('Profiler or baseline identity changed during execution.');
  writeJSON(join(output, 'results.json'), {
    revision: child('git', ['rev-parse', 'HEAD'], repo).trim(),
    benchmark_results_sha256: baselineHash,
    runtime_files: runtime,
    benchmark_protocol: protocol,
    environment: environment(node),
    profiler_files: toolHashes,
    measurement: measurementProtocol,
    protocol: {
      trials_per_case_and_mode: trials,
      cpu_interval_us: 1000,
      heap_interval_bytes: 524288,
      include_collected_allocations: true,
      serial_execution: true,
      shuffle_seed: 20260920,
      shuffle_algorithm: 'python-mt19937-fisher-yates',
      retained_frames: 'top 20 self; top 30 inclusive plus named product paths',
    },
    cases,
    rows,
  });
  console.log(
    `Passed ${rows.length} profiled command comparisons. Results: ${join(output, 'results.json')}`,
  );
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
