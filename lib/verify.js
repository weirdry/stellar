import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual as equal } from 'node:util';
import { normalizeCapture } from './normalize.js';
import { assertState } from './continuity.js';
import { assertWorkMap, WorkMapError } from './validate.js';
import { readWorkMap, renderWorkMap } from './render.js';

const escapePointer = (key) =>
  String(key).replace(/~/g, '~0').replace(/\//g, '~1');
function difference(expected, actual, path = '') {
  if (equal(expected, actual)) return null;
  if (
    expected &&
    actual &&
    typeof expected === 'object' &&
    typeof actual === 'object' &&
    Array.isArray(expected) === Array.isArray(actual)
  ) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      const at = `${path}/${escapePointer(key)}`;
      if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key))
        return at;
      const found = difference(expected[key], actual[key], at);
      if (found) return found;
    }
  }
  return path || '/';
}

function sourceIssue(issue) {
  const result = Object.fromEntries(
    Object.entries(issue).filter(
      ([key]) =>
        !['classification', 'classificationEvidence', 'targets'].includes(key),
    ),
  );
  // This label is generated UI copy, not an observed source status.
  if (issue.detail === 'unqueried') result.status = { type: issue.status.type };
  return result;
}
function keyedDifference(expected, actual, path, project = (value) => value) {
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
const relationKey = ({ kind, source, target }) =>
  JSON.stringify([
    kind,
    ...(kind === 'related' ? [source, target].sort() : [source, target]),
  ]);
function factsDifference(draft, map) {
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
function withRole(input, operation) {
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
export async function verifyRun({ capture, map, html, state }) {
  const draft = withRole('capture', () => normalizeCapture(capture));
  withRole('work-map', () => assertWorkMap(map));
  if (state !== undefined) withRole('state', () => assertState(state));
  const checks = {};
  const diagnostics = [];
  const check = (name, path, input, message, fix) => {
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

  const slots = [
    ...html.matchAll(
      /<script type="application\/json" id="data">([\s\S]*?)<\/script>/g,
    ),
  ];
  let embeddedPath = '/data';
  if (slots.length === 1) {
    try {
      embeddedPath = difference(map, JSON.parse(slots[0][1]), '/data');
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
    html === (await renderWorkMap(map)) ? null : '/',
    'html',
    "HTML differs from this checkout's bundled renderer output.",
    'Verify with the renderer revision used for this report, or render a separate new HTML file with this checkout. Keep the original report.',
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

async function readInput(path, input) {
  try {
    return input === 'html'
      ? await readFile(path, 'utf8')
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
export async function verifyRunFiles(capture, map, html, state) {
  return verifyRun({
    capture: await readInput(capture, 'capture'),
    map: await readInput(map, 'work-map'),
    html: await readInput(html, 'html'),
    ...(state === undefined ? {} : { state: await readInput(state, 'state') }),
  });
}
