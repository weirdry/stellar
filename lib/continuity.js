import { readFileSync } from 'node:fs';
import { mkdir, open, unlink, rmdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { isDeepStrictEqual as equal } from 'node:util';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { assertWorkMap, validateWorkMap, WorkMapError } from './validate.js';
import { normalizeCapture } from './normalize.js';

const schema = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`../schemas/${name}.schema.json`, import.meta.url),
      'utf8',
    ),
  );
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
ajv.addSchema(schema('work-map'), 'work-map.schema.json');
const checkState = ajv.compile(schema('state'));
const checkChoices = ajv.compile(schema('choices'));
const fail = (path, message, fix) => {
  throw new WorkMapError([{ code: 'continuity', path, message, fix }]);
};
const clone = (value) => structuredClone(value);
const key = ({ provider, namespace, nativeId }) =>
  JSON.stringify([provider, namespace, nativeId]);
const identity = (map, issue) => {
  const source = map.sources.find((s) => s.id === issue.sourceId);
  return {
    provider: source.provider,
    namespace: source.namespace,
    nativeId: issue.nativeId,
  };
};
const evidence = (issue) => ({
  title: issue.title,
  ...(issue.description !== undefined
    ? { description: issue.description }
    : {}),
});
const blankChanges = () => ({
  added: [],
  returned: [],
  updated: [],
  notObserved: [],
  review: [],
  preservedUser: [],
});
function shape(check, value) {
  if (!check(value))
    throw new WorkMapError(
      check.errors.map((error) => ({
        code: 'continuity-schema',
        path:
          (error.instancePath || '') +
            (error.params.missingProperty
              ? '/' + error.params.missingProperty
              : '') || '/',
        message: error.message,
        fix: 'Match the saved-state or choices schema; do not edit source facts or discard saved user choices.',
      })),
    );
}
export function assertState(state) {
  shape(checkState, state);
  const diagnostics = validateWorkMap(state.map)
    .diagnostics.filter((d) => d.code !== 'missing-classification')
    .map((d) => ({ ...d, path: '/map' + d.path }));
  if (diagnostics.length) throw new WorkMapError(diagnostics);
  const seen = new Map();
  const categories = new Set(state.map.categories.map((c) => c.id));
  for (const [n, entry] of state.memory.entries()) {
    const at = `/memory/${n}`;
    if (seen.has(key(entry)))
      fail(
        at,
        'Saved source identity occurs more than once.',
        'Keep one memory entry per provider, namespace and nativeId.',
      );
    seen.set(key(entry), entry);
    if (entry.classification && !categories.has(entry.classification.category))
      fail(
        at + '/classification/category',
        'Saved category is undeclared.',
        'Retain the taxonomy used by saved decisions, including issues not observed in this run.',
      );
  }
  for (const [n, issue] of state.map.issues.entries()) {
    const saved = seen.get(key(identity(state.map, issue)));
    if (!saved)
      fail(
        `/map/issues/${n}`,
        'Current issue has no memory entry.',
        'Use remember or refresh to prepare a complete saved state.',
      );
    if (
      issue.classification &&
      !equal(issue.classification, saved.classification)
    )
      fail(
        `/map/issues/${n}/classification`,
        'Current and saved classifications disagree.',
        'Use classify or revise to update both representations together.',
      );
    if (
      saved.classification?.origin === 'user' &&
      !equal(issue.classification, saved.classification)
    )
      fail(
        `/map/issues/${n}/classification`,
        'A saved user classification is missing.',
        'Restore the saved choice through refresh; use revise for an explicit user change.',
      );
    if (!equal(issue.targets, saved.targets))
      fail(
        `/map/issues/${n}/targets`,
        'Current and saved targets disagree.',
        'Use classify or revise to update both representations together.',
      );
  }
  return state;
}
function rememberIssue(map, issue) {
  return {
    ...identity(map, issue),
    identifier: issue.identifier,
    ...(issue.classification
      ? { classification: clone(issue.classification) }
      : {}),
    targets: clone(issue.targets),
    // Existing work maps have one origin for their authored interpretation.
    targetsOrigin: issue.classification?.origin || 'agent',
    ...(issue.detail === 'full' ? { evidence: evidence(issue) } : {}),
  };
}
export function rememberMap(map) {
  assertWorkMap(map);
  return assertState({
    schemaVersion: 1,
    map: clone(map),
    memory: map.issues.map((issue) => rememberIssue(map, issue)),
    changes: blankChanges(),
  });
}
export function refreshState(previous, capture) {
  assertState(previous);
  const map = normalizeCapture(capture);
  if (map.owner !== previous.map.owner)
    fail(
      '/owner',
      'Capture owner differs from saved state.',
      'Select the state for this person; start a separate state for another owner.',
    );
  map.domains = clone(previous.map.domains);
  map.categories = clone(previous.map.categories);
  const memory = new Map(
    previous.memory.map((entry) => [key(entry), clone(entry)]),
  );
  const priorIssues = new Map(
    previous.map.issues.map((issue) => [
      key(identity(previous.map, issue)),
      issue,
    ]),
  );
  const observed = new Set();
  const changes = blankChanges();
  for (const issue of map.issues) {
    const id = identity(map, issue),
      stable = key(id),
      saved = memory.get(stable);
    observed.add(stable);
    if (!saved) {
      changes.added.push(issue.id);
      const uncertain = previous.memory.some(
        (entry) =>
          entry.provider === id.provider &&
          entry.namespace === id.namespace &&
          entry.identifier === issue.identifier,
      );
      if (issue.scope === 'assigned')
        changes.review.push({
          issueId: issue.id,
          reason: uncertain ? 'identity-uncertain' : 'new-issue',
        });
      memory.set(stable, rememberIssue(map, issue));
      continue;
    }
    const prior = priorIssues.get(stable);
    if (!prior) changes.returned.push(issue.id);
    else {
      const fields = [
        ...new Set([...Object.keys(prior), ...Object.keys(issue)]),
      ]
        .filter(
          (field) =>
            !['id', 'sourceId', 'classification', 'targets'].includes(field) &&
            !equal(prior[field], issue[field]),
        )
        .sort();
      if (fields.length) changes.updated.push({ issueId: issue.id, fields });
    }
    // Compare only observed full text. Unknown context never replaces evidence.
    const changedPurpose =
      issue.detail === 'full' && !equal(saved.evidence, evidence(issue));
    const pending =
      prior &&
      !prior.classification &&
      previous.changes.review.some((r) => r.issueId === prior.id);
    if (saved.classification?.origin === 'user') {
      issue.classification = clone(saved.classification);
      changes.preservedUser.push(issue.id);
    } else if (saved.classification && !changedPurpose && !pending)
      issue.classification = clone(saved.classification);
    issue.targets = clone(saved.targets);
    if (issue.scope === 'assigned' && !issue.classification)
      changes.review.push({
        issueId: issue.id,
        reason: saved.classification ? 'purpose-text-changed' : 'new-issue',
      });
    saved.identifier = issue.identifier;
    // Keep the baseline until a pending agent decision is revisited, including
    // across an intervening run in which this issue is not observed.
    if (
      issue.detail === 'full' &&
      (!changedPurpose || saved.classification?.origin === 'user')
    )
      saved.evidence = evidence(issue);
  }
  changes.notObserved = [...memory.values()]
    .filter((entry) => !observed.has(key(entry)))
    .map(({ provider, namespace, nativeId }) => ({
      provider,
      namespace,
      nativeId,
    }));
  return assertState({
    schemaVersion: 1,
    map,
    memory: [...memory.values()],
    changes,
  });
}
export function applyChoices(previous, choices, actor) {
  assertState(previous);
  shape(checkChoices, choices);
  if (!['agent', 'user'].includes(actor))
    throw new Error('Choice actor must be agent or user.');
  const state = clone(previous),
    map = state.map;
  for (const field of ['domains', 'categories']) {
    const seen = new Set();
    for (const [n, item] of (choices[field] || []).entries()) {
      if (seen.has(item.id))
        fail(
          `/${field}/${n}/id`,
          'Taxonomy identity is repeated.',
          'Supply each domain or category once.',
        );
      seen.add(item.id);
      if (
        field === 'categories' &&
        !map.domains.some((domain) => domain.id === item.domain)
      )
        fail(
          `/categories/${n}/domain`,
          'Category domain is undeclared.',
          'Choose an existing domain or supply it with this change.',
        );
      const at = map[field].findIndex((old) => old.id === item.id);
      if (at < 0) map[field].push(clone(item));
      else {
        if (actor === 'agent' && !equal(map[field][at], item))
          fail(
            `/${field}/${n}`,
            'Automatic classification cannot redefine an existing group.',
            'Reuse the group or add a distinct group. Use revise for a user-requested taxonomy change.',
          );
        map[field][at] = clone(item);
      }
    }
  }
  const seen = new Set();
  for (const [n, choice] of (choices.issues || []).entries()) {
    if (seen.has(choice.issueId))
      fail(
        `/issues/${n}/issueId`,
        'Issue choice is repeated.',
        'Supply one choice per current issue.',
      );
    seen.add(choice.issueId);
    const issue = map.issues.find((i) => i.id === choice.issueId);
    if (!issue)
      fail(
        `/issues/${n}/issueId`,
        'Choice does not identify a current issue.',
        'Use the issueId from this state work-map; do not match a title or issue number.',
      );
    const saved = state.memory.find(
      (entry) => key(entry) === key(identity(map, issue)),
    );
    if (choice.classification) {
      if (
        !map.categories.some(
          (category) => category.id === choice.classification.category,
        )
      )
        fail(
          `/issues/${n}/classification/category`,
          'Choice category is undeclared.',
          'Choose an existing category or supply it with this change.',
        );
      if (actor === 'agent' && saved.classification?.origin === 'user') {
        if (
          !equal(choice.classification, {
            category: saved.classification.category,
            rationale: saved.classification.rationale,
          })
        )
          fail(
            `/issues/${n}/classification`,
            'Automatic classification would overwrite a user choice.',
            'Keep the saved classification. Use revise only for an explicit user instruction.',
          );
      } else
        saved.classification = {
          ...clone(choice.classification),
          origin: actor,
        };
      issue.classification = clone(saved.classification);
      if (issue.detail === 'full') saved.evidence = evidence(issue);
    }
    if (choice.targets) {
      if (actor === 'agent' && saved.targetsOrigin === 'user') {
        if (!equal(saved.targets, choice.targets))
          fail(
            `/issues/${n}/targets`,
            'Automatic classification would overwrite user targets.',
            'Keep the saved targets. Use revise only for an explicit user instruction.',
          );
      } else {
        saved.targets = clone(choice.targets);
        saved.targetsOrigin = actor;
      }
      issue.targets = clone(saved.targets);
    }
  }
  state.changes.review = state.changes.review.filter(
    (entry) =>
      !map.issues.find((issue) => issue.id === entry.issueId)?.classification,
  );
  return assertState(state);
}
export async function writeRun(state, directory) {
  assertState(state);
  const files = {
    'state.json': JSON.stringify(state, null, 2) + '\n',
    'work-map.json': JSON.stringify(state.map, null, 2) + '\n',
    'changes.json': JSON.stringify(state.changes, null, 2) + '\n',
  };
  const output = resolve(directory);
  await mkdir(dirname(output), { recursive: true });
  // Exclusive directory creation protects old runs, input files and symlink
  // aliases. No shared mutable state, background worker or overwrite mode exists.
  await mkdir(output, { mode: 0o700 });
  const created = [];
  try {
    for (const [name, content] of Object.entries(files)) {
      const path = join(output, name);
      const file = await open(path, 'wx', 0o600);
      created.push(path);
      try {
        await file.writeFile(content, 'utf8');
      } finally {
        await file.close();
      }
    }
  } catch (error) {
    for (const path of created) await unlink(path);
    await rmdir(output).catch(() => {});
    throw error;
  }
  return {
    run: output,
    needsClassification: state.map.issues.filter(
      (i) => i.scope === 'assigned' && !i.classification,
    ).length,
    added: state.changes.added.length,
    updated: state.changes.updated.length,
    notObserved: state.changes.notObserved.length,
    review: state.changes.review.length,
  };
}
