import { isObject, required } from './contracts.ts';
import type {
  WorkMap,
  Issue,
  Relation,
  InputRole,
  Diagnostic,
} from './contracts.ts';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual as equal } from 'node:util';
import { normalizeCapture } from './normalize.ts';
import { assertState } from './continuity.ts';
import { assertWorkMap, WorkMapError } from './validate.ts';
import { readWorkMap, renderWorkMap } from './render.ts';

const escapePointer = (key: string) =>
  String(key).replace(/~/g, '~0').replace(/\//g, '~1');
function difference(
  expected: unknown,
  actual: unknown,
  path = '',
): string | null {
  if (equal(expected, actual)) return null;
  if (
    isObject(expected) &&
    isObject(actual) &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      if (!Object.hasOwn(expected, key)) return path || '/';
      const at = `${path}/${escapePointer(key)}`;
      if (!Object.hasOwn(actual, key)) return at;
      const found = difference(expected[key], actual[key], at);
      if (found) return found;
    }
  }
  return path || '/';
}

function sourceIssue(issue: Issue) {
  const result: Record<string, unknown> = Object.fromEntries(
    Object.entries(issue).filter(
      ([key]) =>
        !['classification', 'classificationEvidence', 'targets'].includes(key),
    ),
  );
  // This label is generated UI copy, not an observed source status.
  if (issue.detail === 'unqueried')
    result['status'] = { type: issue.status.type };
  return result;
}
function keyedDifference<T extends { id: string }>(
  expected: T[],
  actual: T[],
  path: string,
  project: (value: T) => unknown = (value) => value,
) {
  const byId = new Map(expected.map((item) => [item.id, item]));
  for (const [index, item] of actual.entries()) {
    const prior = byId.get(item.id);
    if (!prior) return `${path}/${index}/id`;
    const found = difference(project(prior), project(item), `${path}/${index}`);
    if (found) return found;
    byId.delete(item.id);
  }
  return byId.size ? path : null;
}
const relationKey = ({ kind, source, target }: Relation) =>
  JSON.stringify([
    kind,
    ...(kind === 'related' ? [source, target].sort() : [source, target]),
  ]);
function factsDifference(draft: WorkMap, map: WorkMap) {
  return (
    difference(draft.owner, map.owner, '/owner') ||
    keyedDifference(draft.sources, map.sources, '/sources') ||
    keyedDifference(draft.issues, map.issues, '/issues', sourceIssue) ||
    (!equal(
      draft.relations.map(relationKey).sort(),
      map.relations.map(relationKey).sort(),
    )
      ? '/relations'
      : null)
  );
}
function withRole<T>(input: InputRole, operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof WorkMapError)
      throw new WorkMapError(
        error.diagnostics.map((diagnostic) => ({ ...diagnostic, input })),
      );
    throw error;
  }
}

// Pure artifact checks: no browser, source requests, execution of supplied HTML,
// output writes, or inference about the correctness of an agent's taxonomy.
export async function verifyRun({
  capture,
  map: inputMap,
  html,
  state: inputState,
}: {
  capture: unknown;
  map: unknown;
  html: string | Buffer;
  state?: unknown;
}) {
  const draft = withRole('capture', () => normalizeCapture(capture));
  const map = withRole('work-map', () => assertWorkMap(inputMap));
  const state =
    inputState === undefined
      ? undefined
      : withRole('state', () => assertState(inputState));
  type CheckName =
    'captureFacts' | 'embeddedMap' | 'bundledViewer' | 'stateMap';
  const checks: Partial<Record<CheckName, 'pass' | 'fail' | 'not-provided'>> =
    {};
  const diagnostics: Diagnostic[] = [];
  const check = (
    name: CheckName,
    path: string | null,
    input: InputRole | 'html',
    message: string,
    fix: string,
  ) => {
    checks[name] = path ? 'fail' : 'pass';
    if (path)
      diagnostics.push({ code: 'run-mismatch', input, path, message, fix });
  };
  check(
    'captureFacts',
    factsDifference(draft, map),
    'work-map',
    'Work-map source facts differ from the normalized capture.',
    'Use the matching capture; restore normalized facts and reapply only interpretation. Preserve original inputs.',
  );

  // Decode only for JSON inspection; retain original bytes for bundle identity.
  const htmlBytes = Buffer.isBuffer(html) ? html : Buffer.from(html, 'utf8');
  const slots = [
    ...htmlBytes
      .toString('utf8')
      .matchAll(
        /<script type="application\/json" id="data">([\s\S]*?)<\/script>/g,
      ),
  ];
  let embeddedPath: string | null = '/data';
  if (slots.length === 1) {
    try {
      const embedded: unknown = JSON.parse(
        required(slots[0]?.[1], 'The embedded JSON slot exists.'),
      );
      embeddedPath = difference(map, embedded, '/data');
    } catch {
      /* Invalid embedded JSON is a mismatch, never a parser excerpt. */
    }
  }
  check(
    'embeddedMap',
    embeddedPath,
    'html',
    'HTML does not contain exactly one matching embedded work map.',
    'Render the selected final work map into a new HTML file; do not patch embedded data.',
  );
  check(
    'bundledViewer',
    htmlBytes.equals(Buffer.from(await renderWorkMap(map), 'utf8'))
      ? null
      : '/',
    'html',
    "HTML differs from this runner's bundled renderer output.",
    'If available, verify with the original runner and viewer files recorded for this report. Otherwise render a separate new HTML file with this runner; this does not verify the original HTML. Keep the original report.',
  );
  checks.stateMap = 'not-provided';
  if (state !== undefined)
    check(
      'stateMap',
      difference(map, state.map, '/map'),
      'state',
      'Saved state and final work map differ.',
      'Select the matching state and map emitted by continuity; do not edit saved state to hide the mismatch.',
    );
  return {
    valid: diagnostics.length === 0,
    checks,
    diagnostics,
    notChecked: [
      'source-collection',
      'classification-meaning',
      'visual-interaction',
      'prior-state-continuity',
    ],
  };
}

function readInput(path: string, input: 'html'): Promise<Buffer>;
function readInput(path: string, input: InputRole): Promise<unknown>;
async function readInput(
  path: string,
  input: InputRole | 'html',
): Promise<unknown> {
  try {
    return input === 'html'
      ? await readFile(path)
      : await readWorkMap(path, input);
  } catch (error) {
    if (error instanceof WorkMapError) throw error;
    throw new WorkMapError([
      {
        code: 'input-read',
        input,
        path: '/',
        message: 'The verification input could not be read.',
        fix: 'Check this input argument, file existence and read permissions; keep previous inputs and reports.',
      },
    ]);
  }
}
export async function verifyRunFiles(
  capture: string,
  map: string,
  html: string,
  state?: string,
) {
  return verifyRun({
    capture: await readInput(capture, 'capture'),
    map: await readInput(map, 'work-map'),
    html: await readInput(html, 'html'),
    ...(state === undefined ? {} : { state: await readInput(state, 'state') }),
  });
}
