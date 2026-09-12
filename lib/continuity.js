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
  ...(issue.description != null ? { description: issue.description } : {}),
});
const blankChanges = () => ({
  added: [],
  returned: [],
  updated: [],
  notObserved: [],
  review: [],
  preservedUser: [],
});
const currentReviews = (map, memory) => {
  const saved = new Map(memory.map((entry) => [key(entry), entry]));
  return map.issues.flatMap((issue) => {
    const reason = saved.get(key(identity(map, issue)))?.reviewReason;
    return reason ? [{ issueId: issue.id, reason }] : [];
  });
};
function assertRunReferences(map, prefix = '') {
  for (const [n, attachment] of (map.attachments || []).entries())
    if (!/^https?:\/\//.test(attachment.href))
      fail(
        `${prefix}/attachments/${n}/href`,
        'Report-relative references cannot be carried into a new run.',
        'Continuity requires verified HTTP(S) reference links. Keep the original map/state and its files; use the standalone renderer beside those files when a local reference is required. Do not remove references or upload files just to pass validation.',
      );
}
function shape(check, value) {
  if (!check(value)) {
    const input = check === checkState ? 'state' : 'choices';
    // Only collapse the two choices alternatives whose branches describe
    // presence, not separate field requirements. Other schema errors survive.
    const alternatives =
      input === 'choices'
        ? check.errors.filter(
            (error) =>
              error.keyword === 'anyOf' &&
              ['#/anyOf', '#/properties/issues/items/anyOf'].includes(
                error.schemaPath,
              ),
          )
        : [];
    const errors = check.errors.filter(
      (error) =>
        !alternatives.some(
          (alternative) =>
            error.schemaPath.startsWith(alternative.schemaPath + '/') &&
            (error.instancePath === alternative.instancePath ||
              error.instancePath.startsWith(alternative.instancePath + '/')),
        ),
    );
    throw new WorkMapError(
      errors.map((error) => {
        const property =
          error.params.missingProperty ?? error.params.additionalProperty;
        return {
          code: 'continuity-schema',
          input,
          path:
            (error.instancePath || '') +
              (property !== undefined
                ? '/' + property.replace(/~/g, '~0').replace(/\//g, '~1')
                : '') || '/',
          message: alternatives.includes(error)
            ? error.instancePath === ''
              ? 'Provide at least one nonempty domains, categories or issues array.'
              : 'Provide classification or targets (or both) for this issue choice.'
            : error.message,
          fix:
            input === 'state'
              ? 'Use a valid state produced by a continuity command; retain the original state and saved user choices.'
              : 'Match schemas/choices.schema.json and change only the requested interpretation fields.',
        };
      }),
    );
  }
}
export function assertState(state) {
  shape(checkState, state);
  const diagnostics = validateWorkMap(state.map)
    .diagnostics.filter((d) => d.code !== 'missing-classification')
    .map((d) => ({ ...d, path: '/map' + d.path }));
  if (diagnostics.length) throw new WorkMapError(diagnostics);
  assertRunReferences(state.map, '/map');
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
    if (entry.reviewReason && entry.classification?.origin === 'user')
      fail(
        at + '/reviewReason',
        'An explicit user classification cannot remain pending.',
        'Use a valid saved state; classify or revise must update the decision and its review reason together.',
      );
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
    if (saved.reviewReason && issue.classification)
      fail(
        `/map/issues/${n}/classification`,
        'An unresolved saved review cannot publish a classification.',
        'Keep the classification withheld until classify or revise explicitly resolves it.',
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
    if (
      issue.scope === 'assigned' &&
      !issue.classification &&
      !saved.reviewReason
    )
      fail(
        `/memory/${state.memory.indexOf(saved)}/reviewReason`,
        'An unclassified assigned issue has no saved review reason.',
        'Use a valid state emitted by refresh; keep pending review with its source identity.',
      );
    if (!equal(issue.targets, saved.targets))
      fail(
        `/map/issues/${n}/targets`,
        'Current and saved targets disagree.',
        'Use classify or revise to update both representations together.',
      );
  }
  if (!equal(state.changes.review, currentReviews(state.map, state.memory)))
    fail(
      '/changes/review',
      'Current review summary disagrees with saved reasons.',
      'Use the state emitted by remember, refresh, classify or revise; do not edit its summary independently.',
    );
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
  assertRunReferences(map);
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
  if (previous.map.attachments)
    map.attachments = clone(previous.map.attachments);
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
      stable = key(id);
    let saved = memory.get(stable);
    observed.add(stable);
    if (!saved) {
      changes.added.push(issue.id);
      const uncertain = previous.memory.some(
        (entry) =>
          entry.provider === id.provider &&
          entry.namespace === id.namespace &&
          entry.identifier === issue.identifier,
      );
      saved = rememberIssue(map, issue);
      if (uncertain || issue.scope === 'assigned')
        saved.reviewReason = uncertain ? 'identity-uncertain' : 'new-issue';
      memory.set(stable, saved);
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
            ![
              'id',
              'sourceId',
              'classification',
              'classificationEvidence',
              'targets',
            ].includes(field) && !equal(prior[field], issue[field]),
        )
        .sort();
      if (fields.length) changes.updated.push({ issueId: issue.id, fields });
    }
    // Compare only observed full text. Unknown context never replaces evidence.
    const changedPurpose =
      issue.detail === 'full' &&
      !equal(saved.evidence && evidence(saved.evidence), evidence(issue));
    if (saved.classification?.origin === 'user') {
      issue.classification = clone(saved.classification);
      changes.preservedUser.push(issue.id);
    } else {
      if (saved.classification && changedPurpose)
        saved.reviewReason ||= 'purpose-text-changed';
      if (saved.classification && !saved.reviewReason)
        issue.classification = clone(saved.classification);
      if (issue.scope === 'assigned' && !issue.classification)
        saved.reviewReason ||= 'new-issue';
    }
    if (issue.detail === 'unqueried' && issue.classification && saved.evidence)
      issue.classificationEvidence = 'previous-observation';
    issue.targets = clone(saved.targets);
    saved.identifier = issue.identifier;
    // Keep the baseline until a pending agent decision is revisited, including
    // across an intervening run in which this issue is not observed.
    if (issue.detail === 'full' && !saved.reviewReason)
      saved.evidence = evidence(issue);
  }
  changes.review = currentReviews(map, [...memory.values()]);
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
      } else {
        saved.classification = {
          ...clone(choice.classification),
          origin: actor,
        };
        delete issue.classificationEvidence;
      }
      issue.classification = clone(saved.classification);
      delete saved.reviewReason;
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
  state.changes.review = currentReviews(map, state.memory);
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
  const created = [];
  let parentReady = false;
  let ownsDirectory = false;
  try {
    await mkdir(dirname(output), { recursive: true });
    parentReady = true;
    // Exclusive creation protects old runs, input files and symlink aliases.
    await mkdir(output, { mode: 0o700 });
    ownsDirectory = true;
    for (const [name, content] of Object.entries(files)) {
      const path = join(output, name);
      const file = await open(path, 'wx', 0o600);
      created.push(path);
      try {
        await file.writeFile(content, 'utf8');
      } catch (error) {
        await file.close().catch(() => {});
        throw error;
      }
      await file.close();
    }
  } catch (error) {
    let cleanupFailed = false;
    if (ownsDirectory) {
      for (const path of created)
        await unlink(path).catch(() => {
          cleanupFailed = true;
        });
      await rmdir(output).catch(() => {
        cleanupFailed = true;
      });
    }
    const exists = error.code === 'EEXIST' && parentReady && !ownsDirectory;
    const failure = new WorkMapError([
      {
        code: 'run-output',
        path: '/run',
        message: exists
          ? 'The output run path already exists.'
          : ['EACCES', 'EPERM', 'EROFS'].includes(error.code)
            ? 'The output run location is not writable.'
            : error.code === 'ENOTDIR' ||
                (error.code === 'EEXIST' && !parentReady)
              ? 'An output parent path is not a directory.'
              : 'The output run could not be written.',
        fix: exists
          ? 'Choose a fresh unused run directory; keep existing inputs and reports.'
          : 'Check the output parent directory, write permissions and available space; retry with a fresh unused run directory and keep earlier runs.',
        ...(cleanupFailed
          ? {
              cleanup:
                'Some newly created output files may remain. Inspect the failed run directory; do not use it as a saved state.',
            }
          : {}),
      },
    ]);
    failure.cause = error;
    throw failure;
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
