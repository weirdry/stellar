// Bounded synthetic comparison of identical selected evidence, not token telemetry.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { normalizeCapture } from '../../lib/normalize.ts';
import { readBody, readIssue } from '../../lib/reading.ts';
import { record, array, required } from '../support/values.ts';
import {
  repo,
  join,
  json,
  writeJSON,
  fresh,
  options,
  option,
  positive,
  measure,
  median,
  environment,
  digest,
  measurementProtocol,
} from './common.ts';
import type { Measurement } from './common.ts';

const args = options(['output', 'trials'], { trials: '5' });
const trials = positive(option(args, 'trials'));
const output = fresh(option(args, 'output'));
const map = normalizeCapture(json(join(repo, 'examples/mixed-capture.json')));
for (const issue of map.issues)
  issue.description =
    '# Scope\n\nMeasure synthetic drift.\n\n# Exclusions\n\nDo not recompute observations.\n';
const mapPath = join(output, 'draft.json');
writeJSON(mapPath, map);
const runner = join(repo, 'bin/stellar.mjs');
type Request = { issue: string; block?: number };
const scenarios: { name: string; requests: Request[] }[] = [
  {
    name: 'selective-blocks',
    requests: map.issues
      .slice(0, 3)
      .flatMap((issue) =>
        [0, 1, 3].map((block) => ({ issue: issue.id, block })),
      ),
  },
  {
    name: 'distinct-short-bodies',
    requests: map.issues.map((issue) => ({ issue: issue.id })),
  },
];
const results = [];
for (const { name, requests } of scenarios) {
  const dir = join(output, name);
  mkdirSync(dir);
  const requestsPath = join(dir, 'requests.json');
  writeJSON(requestsPath, requests);
  const expected = requests.map((r) =>
    r.block === undefined
      ? readBody(map, r.issue)
      : readIssue(map, r.issue, r.block),
  );
  const rows: (Measurement & {
    mode: string;
    trial: number;
    calls: number;
    bytes: number;
  })[] = [];
  // One warmup per mode, then alternating order. Every subprocess output is verified.
  for (let trial = 0; trial <= trials; trial++) {
    for (const mode of trial % 2
      ? ['batch', 'individual']
      : ['individual', 'batch']) {
      const invocations =
        mode === 'batch'
          ? [['read-batch', mapPath, requestsPath]]
          : requests.map((r) =>
              r.block === undefined
                ? ['read-body', mapPath, r.issue]
                : ['read-issue', mapPath, r.issue, String(r.block)],
            );
      let bytes = 0,
        wall_ms = 0,
        cpu_ms = 0,
        peak_rss_mib = 0;
      for (const [index, invocation] of invocations.entries()) {
        const prefix = join(dir, `${trial}-${mode}-${index}`);
        const files = {
          tag: name,
          stdout: prefix + '.json',
          stderr: prefix + '.stderr',
          resources: prefix + '.time',
        };
        const measured = measure(
          process.execPath,
          [runner, ...invocation],
          files,
        );
        bytes += readFileSync(files.stdout).length;
        wall_ms += measured.wall_ms;
        cpu_ms += measured.cpu_ms;
        peak_rss_mib = Math.max(peak_rss_mib, measured.peak_rss_mib);
        const value = json(files.stdout);
        if (mode === 'individual') assert.deepEqual(value, expected[index]);
        else {
          const batch = record(value),
            metadata = array(batch['issues']);
          assert.equal(batch['nextOffset'], null);
          assert.deepEqual(
            array(batch['items']).map((item, requestIndex) => {
              const { request, issueIndex, ...excerpt } = record(item);
              assert.equal(request, requestIndex);
              assert.equal(typeof issueIndex, 'number');
              if (typeof issueIndex !== 'number')
                throw new Error('Invalid issue reference.');
              return { ...excerpt, issue: required(metadata[issueIndex]) };
            }),
            expected,
          );
        }
      }
      if (trial)
        rows.push({
          mode,
          trial,
          calls: invocations.length,
          bytes,
          wall_ms,
          cpu_ms,
          peak_rss_mib,
        });
    }
  }
  results.push({
    name,
    requestHash: digest(requestsPath),
    rows,
    summary: ['individual', 'batch'].map((mode) => {
      const selected = rows.filter((r) => r.mode === mode);
      return {
        mode,
        calls: required(selected[0]).calls,
        bytes: required(selected[0]).bytes,
        wall_ms: median(selected.map((r) => r.wall_ms)),
        cpu_ms: median(selected.map((r) => r.cpu_ms)),
        peak_rss_mib: median(selected.map((r) => r.peak_rss_mib)),
      };
    }),
  });
}
const report = {
  environment: environment(process.execPath),
  protocol: measurementProtocol,
  scope:
    'Same synthetic evidence; fresh Node subprocesses, warm caches, one warmup and alternating trial order. Sequential individual wall/CPU sums; peak RSS is their maximum, not a sum. No model/host tool calls, token telemetry, latency guarantee, or threshold.',
  trials,
  mapHash: digest(mapPath),
  runnerHash: digest(runner),
  readerHash: digest(join(repo, 'lib/reading.ts')),
  results,
};
writeJSON(join(output, 'results.json'), report);
console.log(JSON.stringify(report, null, 2));
