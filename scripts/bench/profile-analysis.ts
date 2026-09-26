import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { record, array, required } from '../support/values.ts';

export interface Frame {
  function: string;
  url: string;
  line: number;
  column: number;
}
export type Ranked = Frame & { us?: number; bytes?: number };
export interface Attribution {
  self: Ranked[];
  inclusive: Ranked[];
}
export interface CpuSummary extends Attribution {
  sample_count: number;
  sampled_us: number;
  profile_duration_us: number;
}
export interface HeapSummary extends Attribution {
  parameters: unknown;
  estimated_allocated_bytes: number;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new TypeError('Expected a finite profile number.');
  return value;
}
export function frameKey(value: unknown, stage: string, script: string): Frame {
  const frame = record(value);
  let url = typeof frame['url'] === 'string' ? frame['url'] : '';
  const stageUrl = pathToFileURL(stage).href.replace(/\/$/, '') + '/';
  if (url.startsWith(stageUrl)) url = url.slice(stageUrl.length);
  else if (url === pathToFileURL(script).href) url = 'profiler/heap-sample.ts';
  else if (url.startsWith('file:')) url = 'external-file/' + basename(url);
  return {
    function:
      typeof frame['functionName'] === 'string' ? frame['functionName'] : '',
    url,
    line: number(frame['lineNumber'] ?? -1) + 1,
    column: number(frame['columnNumber'] ?? -1) + 1,
  };
}
function add(values: Map<string, number>, key: string, amount: number) {
  values.set(key, (values.get(key) ?? 0) + amount);
}
function ranked(
  values: Map<string, number>,
  frames: Map<string, Frame>,
  unit: 'us' | 'bytes',
): Ranked[] {
  return [...values]
    .map<Ranked>(([key, value]) => ({
      ...required(frames.get(key)),
      [unit]: value,
    }))
    .sort(
      (a, b) =>
        number(b[unit]) - number(a[unit]) ||
        compare(a.function, b.function) ||
        compare(a.url, b.url) ||
        a.line - b.line ||
        a.column - b.column,
    );
}
function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
function frameIndex(stage: string, script: string) {
  const frames = new Map<string, Frame>();
  return {
    frames,
    key(this: void, value: unknown) {
      const frame = frameKey(value, stage, script),
        key = JSON.stringify(frame);
      frames.set(key, frame);
      return key;
    },
  };
}
export function cpuSummary(
  value: unknown,
  stage: string,
  script: string,
): CpuSummary {
  const profile = record(value),
    rows = array(profile['nodes']).map(record),
    nodes = new Map(rows.map((n) => [number(n['id']), n]));
  const parents = new Map<number, number>();
  for (const row of rows)
    for (const child of array(row['children'] ?? []))
      parents.set(number(child), number(row['id']));
  const own = new Map<string, number>(),
    inclusive = new Map<string, number>(),
    { frames, key } = frameIndex(stage, script);
  const samples = array(profile['samples']).map(number),
    deltas = array(profile['timeDeltas']).map(number);
  if (samples.length !== deltas.length || deltas.some((n) => n < 0))
    throw new Error('CPU samples and nonnegative time deltas must align.');
  for (const [index, sample] of samples.entries()) {
    const delta = required(deltas[index]);
    add(own, key(required(nodes.get(sample))['callFrame']), delta);
    let id: number | undefined = sample;
    const seen = new Set<string>(),
      visited = new Set<number>();
    while (id !== undefined) {
      if (visited.has(id)) throw new Error('Cyclic CPU profile parent chain.');
      visited.add(id);
      const frame = key(required(nodes.get(id))['callFrame']);
      if (!seen.has(frame)) {
        add(inclusive, frame, delta);
        seen.add(frame);
      }
      id = parents.get(id);
    }
  }
  return {
    sample_count: samples.length,
    sampled_us: deltas.reduce((a, b) => a + b, 0),
    profile_duration_us:
      number(profile['endTime']) - number(profile['startTime']),
    self: ranked(own, frames, 'us'),
    inclusive: ranked(inclusive, frames, 'us'),
  };
}
export function heapSummary(
  value: unknown,
  stage: string,
  script: string,
): HeapSummary {
  const document = record(value),
    own = new Map<string, number>(),
    inclusive = new Map<string, number>(),
    { frames, key } = frameIndex(stage, script);
  function visit(value: unknown, ancestors: Set<string>) {
    const node = record(value),
      frame = key(node['callFrame']),
      chain = new Set([...ancestors, frame]),
      size = number(node['selfSize']);
    if (size < 0) throw new Error('Heap sizes must be nonnegative.');
    add(own, frame, size);
    for (const ancestor of chain) add(inclusive, ancestor, size);
    for (const child of array(node['children'] ?? [])) visit(child, chain);
  }
  visit(record(document['profile'])['head'], new Set());
  return {
    parameters: document['parameters'],
    estimated_allocated_bytes: [...own.values()].reduce((a, b) => a + b, 0),
    self: ranked(own, frames, 'bytes'),
    inclusive: ranked(inclusive, frames, 'bytes'),
  };
}
export function compact<T extends Attribution>(
  summary: T,
  mode: 'cpu' | 'heap',
): T & { unlisted_self_us?: number; unlisted_self_bytes?: number } {
  const unit = mode === 'cpu' ? 'us' : 'bytes';
  const phases = new Set([
    'normalizeCapture',
    'refreshState',
    'applyChoices',
    'assertState',
    'validateWorkMap',
    'readWorkMap',
    'writeRun',
    'renderWorkMap',
    'structuredClone',
    'serialize',
    '(garbage collector)',
    '(idle)',
  ]);
  return {
    ...summary,
    self: summary.self.slice(0, 20),
    [`unlisted_self_${unit}`]: summary.self
      .slice(20)
      .reduce((sum, frame) => sum + number(frame[unit]), 0),
    inclusive: summary.inclusive.filter(
      (frame, index) => index < 30 || phases.has(frame.function),
    ),
  };
}
