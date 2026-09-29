// Fresh-process peak RSS for large invented batch plans; not a capacity claim.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import type { Capture, WorkMap } from '../../lib/contracts.ts';
import { record, required } from '../support/values.ts';
import {
  repo,
  join,
  dirname,
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
  hashes,
  verifyFiles,
  stageRuntime,
  usageError,
  measurementProtocol,
} from './common.ts';
import type { Measurement } from './common.ts';

const args = options(['output', 'trials', 'baseline', 'issues'], {
  trials: '3',
  issues: '2000',
});
const trials = positive(option(args, 'trials'));
const issuesArgument = option(args, 'issues');
if (!/^\d+$/.test(issuesArgument) || Number(issuesArgument) < 40)
  usageError('Issues must be an integer of at least 40 for multi-page plans.');
const count = Number(issuesArgument);
const outputPath = option(args, 'output');

// Read and verify the complete baseline runtime before reserving the output,
// so unavailable history leaves nothing behind and the same path can be retried.
const git = (...command: string[]) =>
  execFileSync('git', command, {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 1 << 30,
  });
let baseline: { revision: string; files: Map<string, Buffer> } | undefined;
if (typeof args['baseline'] === 'string') {
  const requested = option(args, 'baseline');
  let revision: string;
  try {
    revision = git(
      'rev-parse',
      '--verify',
      '--end-of-options',
      `${requested}^{commit}`,
    )
      .toString('utf8')
      .trim();
  } catch {
    usageError(
      `Baseline ${requested} is unavailable; fetch its history or choose another revision. No output directory was created.`,
    );
  }
  try {
    const manifest = git('show', `${revision}:bin/stellar.manifest.json`);
    const listed = hashes(
      record(JSON.parse(manifest.toString('utf8')))['files'],
    );
    if (!listed['bin/stellar.mjs']) throw new Error('No runner is listed.');
    const files = new Map([['bin/stellar.manifest.json', manifest]]);
    for (const [path, hash] of Object.entries(listed)) {
      if (
        path.startsWith('/') ||
        path.split('/').some((part) => part === '..' || !part)
      )
        throw new Error('Manifest path escapes the runtime.');
      const bytes = git('show', `${revision}:${path}`);
      if (createHash('sha256').update(bytes).digest('hex') !== hash)
        throw new Error('Runtime file differs from its manifest.');
      files.set(path, bytes);
    }
    baseline = { revision, files };
  } catch {
    usageError(
      `Baseline ${revision} has no complete runtime matching bin/stellar.manifest.json; choose a revision with a generated runner. No output directory was created.`,
    );
  }
}
// Keep checkout provenance from before this run creates its output.
const head = git('rev-parse', 'HEAD').toString('utf8').trim();
const dirty = git('status', '--porcelain').toString('utf8').trim() !== '';
const output = fresh(outputPath);
// Product modules load only after preflight; failures above need no map code.
const { normalizeCapture } = await import('../../lib/normalize.ts');
const { bodyBlocks, readBody, readIssue } =
  await import('../../lib/reading.ts');

// Candidate: the checked, committed-format bundle. Baseline: the exact runtime
// files recorded by an earlier revision's manifest, extracted from Git history.
const runners: { name: string; root: string; revision: string }[] = [];
if (baseline) {
  const root = join(output, 'baseline-skill');
  for (const [path, bytes] of baseline.files) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), bytes);
  }
  verifyFiles(
    root,
    hashes(record(json(join(root, 'bin/stellar.manifest.json')))['files']),
  );
  runners.push({ name: 'baseline', root, revision: baseline.revision });
}
runners.push({
  name: 'candidate',
  root: stageRuntime(output).stage,
  revision: head + (dirty ? ' + uncommitted changes' : ''),
});

// Entirely invented bodies with headings, lists, fences, CRLF, combining and
// astral characters, so code-point offsets differ from UTF-16 offsets.
function body(issue: number, units: number) {
  let text = '';
  for (let unit = 0; unit < units; unit++)
    text +=
      `# Synthetic scope ${issue}.${unit}\r\n\r\n` +
      `Invented measurement paragraph 🪐 測定 é for issue ${issue}. `.repeat(
        6,
      ) +
      '\r\n\r\n- Synthetic list item\n  continued text\n- Another item\n\n' +
      '```text\n# Code, not a heading 🪐\n```\n\n';
  return text;
}
function capture(units: number): Capture {
  return {
    owner: 'Synthetic benchmark',
    locale: 'en',
    view: { initialScope: 'all', exportName: 'synthetic-batch-memory' },
    sources: [
      {
        id: 'linear-bench',
        provider: 'linear',
        name: 'Synthetic linear',
        namespace: 'synthetic-batch-memory',
        scope: 'Invented benchmark records only.',
        snapshotAt: '2026-09-29T00:00:00Z',
        coverage: { issues: 'complete', relations: 'partial' },
        notes: 'Entirely invented benchmark capture; no live source calls.',
      },
    ],
    records: Array.from({ length: count }, (_, i) => ({
      sourceId: 'linear-bench',
      scope: 'assigned',
      data: {
        id: `BENCH-${i}`,
        uuid: `synthetic-linear-${i}`,
        title: `Synthetic batch memory issue ${i}`,
        description: body(i, units),
        status: 'Active',
        statusType: 'started',
        relations: {
          blocks: [],
          blockedBy: [],
          relatedTo: [],
          duplicateOf: null,
        },
      },
    })),
  };
}

type Request = { issue: string; block?: number; offset?: number };
function plans(map: WorkMap): { name: string; requests: Request[] }[] {
  const ids = map.issues.map((issue) => issue.id);
  const last = (id: string) =>
    bodyBlocks(
      required(map.issues.find((issue) => issue.id === id)).description ?? '',
    ).length - 1;
  return [
    { name: 'single-request', requests: [{ issue: required(ids[0]) }] },
    {
      name: 'small-mixed',
      requests: ids
        .slice(0, 15)
        .flatMap((issue) => [
          { issue },
          { issue, block: 1 },
          { issue, offset: 4000 },
        ]),
    },
    { name: 'body-per-issue', requests: ids.map((issue) => ({ issue })) },
    {
      // Repeated body and block selections of each issue, including continuation.
      name: 'repeated-mixed',
      requests: ids.flatMap((issue) => [
        { issue },
        { issue, offset: 4000 },
        { issue, block: 1 },
        { issue, block: 1 },
        { issue, block: last(issue) },
      ]),
    },
  ];
}

// Expected pages come from the unchanged individual readers, joined by the batch
// contract. A one-issue map avoids re-validating the whole map for every item.
function expected(map: WorkMap, requests: Request[], offset: number) {
  const byId = new Map(map.issues.map((issue) => [issue.id, issue]));
  const selected = requests.slice(offset, offset + 20);
  const issues: unknown[] = [];
  const indices = new Map<string, number>();
  const items = selected.map((r, index) => {
    const one = { ...map, issues: [required(byId.get(r.issue))] };
    const result =
      r.block === undefined
        ? readBody(one, r.issue, r.offset)
        : readIssue(one, r.issue, r.block, r.offset);
    const { issue, ...excerpt } = result;
    let issueIndex = indices.get(issue.id);
    if (issueIndex === undefined) {
      issueIndex = issues.length;
      indices.set(issue.id, issueIndex);
      issues.push(issue);
    }
    return { request: offset + index, issueIndex, ...excerpt };
  });
  const end = offset + selected.length;
  return {
    kind: 'batch-excerpts',
    total: requests.length,
    offset,
    nextOffset: end < requests.length ? end : null,
    issues,
    items,
  };
}

const scales = [
  { name: 'small-bodies', units: 12 },
  { name: 'large-bodies', units: 120 },
];
const results = [];
for (const scale of scales) {
  const dir = join(output, scale.name);
  mkdirSync(dir);
  const map = normalizeCapture(capture(scale.units));
  const mapPath = join(dir, 'draft.json');
  writeJSON(mapPath, map);
  // Bodies embed their issue number, so their lengths vary slightly.
  const lengths = map.issues.map(
    (issue) => Array.from(issue.description ?? '').length,
  );
  const workloads: {
    plan: string;
    command: string;
    page: number;
    args: string[];
    expected: unknown;
  }[] = [
    {
      plan: 'single-read-body',
      command: 'read-body',
      page: 0,
      args: ['read-body', mapPath, required(map.issues[0]).id],
      expected: readBody(map, required(map.issues[0]).id),
    },
  ];
  const planRows = [];
  for (const { name, requests } of plans(map)) {
    const requestsPath = join(dir, `${name}.requests.json`);
    writeJSON(requestsPath, requests);
    planRows.push({
      name,
      requests: requests.length,
      requestHash: digest(requestsPath),
    });
    const lastPage = Math.floor((requests.length - 1) / 20) * 20;
    for (const page of [...new Set([0, lastPage])])
      workloads.push({
        plan: name,
        command: 'read-batch',
        page,
        args: ['read-batch', mapPath, requestsPath, String(page)],
        expected: expected(map, requests, page),
      });
  }
  const rows: (Measurement & {
    runner: string;
    plan: string;
    page: number;
    trial: number;
  })[] = [];
  // One warmup, then alternating runner order; every output is verified first.
  for (let trial = 0; trial <= trials; trial++)
    for (const workload of workloads) {
      const order = trial % 2 ? [...runners].reverse() : runners;
      for (const runner of order) {
        const prefix = join(
          dir,
          `${trial}-${runner.name}-${workload.plan}-${workload.page}`,
        );
        const files = {
          tag: `${scale.name} ${runner.name} ${workload.plan} ${workload.page}`,
          stdout: prefix + '.json',
          stderr: prefix + '.stderr',
          resources: prefix + '.time',
        };
        const measured = measure(
          process.execPath,
          [join(runner.root, 'bin/stellar.mjs'), ...workload.args],
          files,
        );
        assert.deepEqual(json(files.stdout), workload.expected, files.tag);
        if (trial)
          rows.push({
            runner: runner.name,
            plan: workload.plan,
            page: workload.page,
            trial,
            ...measured,
          });
      }
    }
  results.push({
    name: scale.name,
    issues: count,
    bodyCodePoints: { min: Math.min(...lengths), max: Math.max(...lengths) },
    serializedMapBytes: statSync(mapPath).size,
    mapHash: digest(mapPath),
    plans: planRows,
    rows,
    summary: workloads.flatMap(({ plan, page, command }) =>
      runners.map(({ name }) => {
        const selected = rows.filter(
          (r) => r.runner === name && r.plan === plan && r.page === page,
        );
        return {
          runner: name,
          command,
          plan,
          page,
          wall_ms: median(selected.map((r) => r.wall_ms)),
          cpu_ms: median(selected.map((r) => r.cpu_ms)),
          peak_rss_mib: median(selected.map((r) => r.peak_rss_mib)),
        };
      }),
    ),
  });
}
const report = {
  environment: environment(process.execPath),
  protocol: measurementProtocol,
  scope:
    'Invented maps and plans; fresh sequential Node processes, warm caches, one warmup and alternating runner order. Every stdout equals the individual-reader expansion. Peak RSS includes input reading, parsing and map validation. No capacity, latency guarantee or threshold.',
  trials,
  runners: runners.map(({ name, root, revision }) => ({
    name,
    revision,
    runnerHash: digest(join(root, 'bin/stellar.mjs')),
  })),
  harnessHash: digest(join(repo, 'scripts/bench/batch-memory.ts')),
  results,
};
writeJSON(join(output, 'results.json'), report);
for (const scale of results)
  for (const row of scale.summary)
    console.log(
      [
        scale.name,
        row.runner,
        row.plan,
        `page ${row.page}`,
        `${row.peak_rss_mib.toFixed(1)} MiB`,
        `${row.wall_ms.toFixed(0)} ms wall`,
        `${row.cpu_ms.toFixed(0)} ms cpu`,
      ].join('\t'),
    );
