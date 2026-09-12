import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { validateWorkMap, WorkMapError } from './validate.js';

const workMapSchema = JSON.parse(
  readFileSync(
    new URL('../schemas/work-map.schema.json', import.meta.url),
    'utf8',
  ),
);
const captureSchema = JSON.parse(
  readFileSync(
    new URL('../schemas/capture.schema.json', import.meta.url),
    'utf8',
  ),
);
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
ajv.addSchema(workMapSchema, 'work-map.schema.json');
const checkCapture = ajv.compile(captureSchema);
const fail = (path, message, fix) => {
  throw new WorkMapError([{ code: 'capture', path, message, fix }]);
};
const nonblank = (value) => typeof value === 'string' && /\S/.test(value);
const keyOf = (source, native) =>
  'i:' +
  Buffer.from(source).toString('base64url') +
  ':' +
  Buffer.from(native).toString('base64url');
const nativeOf = (source, raw) =>
  source.provider === 'linear' ? raw.uuid || raw.id : raw.node_id;
const displayOf = (source, raw) =>
  source.provider === 'linear' ? raw.id : '#' + raw.number;

// Host tools own authentication, pagination and retrieval. This function only
// translates captured facts; it never calls a source or decides a taxonomy.
export function normalizeCapture(capture) {
  if (!checkCapture(capture))
    throw new WorkMapError(
      checkCapture.errors.map((error) => ({
        code: 'capture-schema',
        path: error.instancePath || '/',
        message: error.message,
        fix: 'Match schemas/capture.schema.json. Keep native records intact and record lookup limits.',
      })),
    );
  const sources = new Map(capture.sources.map((source) => [source.id, source]));
  const map = {
    schemaVersion: 1,
    owner: capture.owner,
    locale: capture.locale,
    sources: structuredClone(capture.sources),
    view: structuredClone(capture.view),
    domains: [],
    categories: [],
    issues: [],
    relations: [],
  };
  const aliases = new Map(),
    records = [];
  const aliasKey = (source, native) =>
    JSON.stringify([source.id, String(native)]);
  const bind = (source, alias, id, path) => {
    if (!nonblank(alias)) return;
    const key = aliasKey(source, alias);
    if (aliases.has(key) && aliases.get(key) !== id)
      fail(
        path,
        'Native identity and identifier disagree: conflicting issues.',
        'Resolve conflicting captures against the source; do not merge different issues.',
      );
    aliases.set(key, id);
  };
  for (const [n, entry] of capture.records.entries()) {
    const path = `/records/${n}`,
      source = sources.get(entry.sourceId),
      raw = entry.data;
    if (!source)
      fail(
        path + '/sourceId',
        'Capture source is undeclared.',
        'Declare the workspace or repository in sources.',
      );
    if (!['linear', 'github'].includes(source.provider))
      fail(
        path,
        'No native normalizer exists for this provider.',
        'Use the documented canonical work-map contract for another provider.',
      );
    if (!nonblank(raw.title) || !nonblank(nativeOf(source, raw)))
      fail(
        path + '/data',
        'Issue title or native identity is missing.',
        'Fetch issue detail; Linear requires id and GitHub REST requires node_id.',
      );
    if (source.provider === 'linear' && !nonblank(raw.id))
      fail(
        path,
        'Linear identifier is missing.',
        'Preserve the id field from the connector.',
      );
    if (source.provider === 'github') {
      if (raw.pull_request)
        fail(
          path,
          'A pull request was captured as an issue.',
          'Exclude pull_request records from GitHub issue results.',
        );
      if (
        !Number.isSafeInteger(raw.number) ||
        raw.number < 1 ||
        !['open', 'closed'].includes(raw.state)
      )
        fail(
          path,
          'GitHub number or state is invalid.',
          'Use a native REST issue response, not a search summary or GraphQL projection.',
        );
      if (!githubBelongsTo(source, raw))
        fail(
          path,
          'GitHub issue belongs to another repository.',
          'Declare the matching host/owner/repository namespace and sourceId.',
        );
    }
    const relations = collectRelations(source, entry, path).map((relation) => ({
      ...relation,
      source: endpointSource(
        capture.sources,
        source,
        relation.ref,
        relation.path,
      ),
    }));
    records.push({ entry, source, path, relations });
  }
  // Index explicit native/identifier pairs before resolving identifier-only
  // references. A later UUID observation can join earlier provisional aliases,
  // but two different explicit native IDs must never share an identifier.
  for (const { entry, source, path, relations } of records) {
    for (const observation of [
      { source, ref: entry.data, path },
      ...relations,
    ]) {
      const { source: observedSource, ref, path: observedPath } = observation;
      const native =
        observedSource.provider === 'linear' ? ref.uuid : ref.node_id;
      if (!nonblank(native)) continue;
      bind(observedSource, native, native, observedPath);
      bind(
        observedSource,
        displayOf(observedSource, ref),
        native,
        observedPath,
      );
    }
  }
  const identities = new Map();
  const identify = (source, ref) => {
    const native =
      aliases.get(aliasKey(source, nativeOf(source, ref))) ||
      nativeOf(source, ref);
    const id = keyOf(source.id, native);
    if (!identities.has(id))
      identities.set(id, { id, source, native, refs: [] });
    const identity = identities.get(id);
    identity.refs.push(ref);
    return identity;
  };
  for (const record of records) {
    record.identity = identify(record.source, record.entry.data);
    for (const relation of record.relations)
      relation.identity = identify(relation.source, relation.ref);
  }
  const fullIds = new Set();
  for (const { entry, source, path, identity } of records) {
    const raw = entry.data,
      { id, native } = identity;
    if (fullIds.has(id))
      fail(
        path,
        'Issue detail was captured more than once.',
        'Deduplicate pages and keep one selected full detail response; assigned membership takes precedence over context.',
      );
    fullIds.add(id);
    const issue = {
      id,
      sourceId: source.id,
      nativeId: native,
      identifier: displayOf(source, raw),
      title: raw.title,
      scope: entry.scope,
      detail: 'full',
      status: normalizeStatus(source, raw),
      targets: [],
    };
    const copy = (target, value) => {
      if (value !== undefined) issue[target] = structuredClone(value);
    };
    copy('url', source.provider === 'linear' ? raw.url : raw.html_url);
    copy(
      'description',
      source.provider === 'linear' ? raw.description : raw.body,
    );
    copy(
      'updatedAt',
      source.provider === 'linear' ? raw.updatedAt : raw.updated_at,
    );
    if (source.provider === 'linear') {
      for (const field of [
        'assignee',
        'assigneeId',
        'project',
        'team',
        'startedAt',
        'completedAt',
        'archivedAt',
        'dueDate',
        'labels',
      ])
        copy(field, raw[field]);
      copy(
        'priority',
        typeof raw.priority === 'object' && raw.priority !== null
          ? raw.priority.name
          : raw.priority,
      );
    } else {
      copy('assignee', raw.assignees?.map((a) => a.login).join(', ') || null);
      copy(
        'labels',
        raw.labels?.map((label) =>
          typeof label === 'string' ? label : label.name,
        ),
      );
      copy(
        'completedAt',
        raw.state_reason === 'completed' ? raw.closed_at : undefined,
      );
    }
    map.issues.push(issue);
  }
  for (const { id, source, native, refs } of identities.values()) {
    if (fullIds.has(id)) continue;
    // Prefer observed display identifiers to bare native IDs. Choose metadata
    // deterministically when several endpoint observations describe one issue.
    const firstText = (values) => values.filter(nonblank).sort()[0];
    const displays = refs.map((ref) => displayOf(source, ref));
    const identifier =
      firstText(displays.filter((value) => value !== native)) || native;
    const context = {
      id,
      sourceId: source.id,
      nativeId: native,
      identifier,
      title: firstText(refs.map((ref) => ref.title)) || identifier,
      scope: 'context',
      detail: 'unqueried',
      status: {
        type: 'unknown',
        label: capture.locale === 'ko' ? '미조회' : 'Not queried',
      },
      targets: [],
    };
    const url = firstText(
      refs.map((ref) =>
        source.provider === 'linear' ? ref.url : ref.html_url,
      ),
    );
    if (url) context.url = url;
    map.issues.push(context);
  }
  const edges = new Set();
  const addEdge = (kind, source, target) => {
    const ends =
      kind === 'related' ? [source, target].sort() : [source, target];
    const key = JSON.stringify([kind, ...ends]);
    if (!edges.has(key))
      map.relations.push({ kind, source: ends[0], target: ends[1] });
    edges.add(key);
  };
  for (const { identity, relations } of records)
    for (const { kind, reverse, identity: other } of relations)
      addEdge(
        kind,
        reverse ? other.id : identity.id,
        reverse ? identity.id : other.id,
      );
  // Drafts intentionally lack interpretation, but every source-fact invariant
  // must pass before writing. Rendering still requires all classifications.
  const diagnostics = validateWorkMap(map).diagnostics.filter(
    (d) => d.code !== 'missing-classification',
  );
  if (diagnostics.length) throw new WorkMapError(diagnostics);
  return map;
}

function collectRelations(source, entry, path) {
  const raw = entry.data,
    observations = [];
  const complete =
    source.coverage.relations === 'complete' && entry.scope === 'assigned';
  const links = entry.links || {};
  const list = (value, name, kind, reverse = false) => {
    if (value === undefined && !complete) return;
    if (!Array.isArray(value))
      fail(
        path + '/' + name,
        'Relation collection is missing or malformed.',
        'Capture the returned array, or declare partial/unavailable relationship coverage.',
      );
    for (const [index, ref] of value.entries())
      observations.push({
        ref,
        path: `${path}/${name}/${index}`,
        kind,
        reverse,
      });
  };
  if (source.provider === 'linear') {
    const rel = raw.relations || {};
    list(rel.blocks, 'data/relations/blocks', 'blocks');
    list(rel.blockedBy, 'data/relations/blockedBy', 'blocks', true);
    list(rel.relatedTo, 'data/relations/relatedTo', 'related');
    if (complete && !Object.hasOwn(rel, 'duplicateOf'))
      fail(
        path,
        'Duplicate relation lookup is missing.',
        'Capture get_issue with includeRelations or declare partial coverage.',
      );
    if (rel.duplicateOf)
      observations.push({
        ref: rel.duplicateOf,
        path: path + '/data/relations/duplicateOf',
        kind: 'duplicate',
      });
    if (raw.parentId)
      observations.push({
        ref: { id: raw.parentId },
        path: path + '/data/parentId',
        kind: 'parent',
        reverse: true,
      });
    list(links.children, 'links/children', 'parent');
  } else {
    if (complete && !Object.hasOwn(links, 'parent'))
      fail(
        path,
        'Parent lookup is missing.',
        'Capture the parent endpoint or declare partial coverage.',
      );
    if (links.parent)
      observations.push({
        ref: links.parent,
        path: path + '/links/parent',
        kind: 'parent',
        reverse: true,
      });
    list(links.children, 'links/children', 'parent');
    list(links.blocks, 'links/blocks', 'blocks');
    list(links.blockedBy, 'links/blockedBy', 'blocks', true);
  }
  return observations;
}

function endpointSource(sources, source, ref, path) {
  if (!ref || typeof ref !== 'object')
    fail(
      path,
      'Relation endpoint is not an issue reference.',
      'Keep the endpoint object returned by the source.',
    );
  let targetSource = source;
  if (source.provider === 'github') {
    if (!Number.isSafeInteger(ref.number) || ref.number < 1 || ref.pull_request)
      fail(
        path,
        'GitHub relation reference is not an issue.',
        'Retain the native issue number and exclude pull requests.',
      );
    targetSource = sources.find(
      (candidate) =>
        candidate.provider === 'github' && githubBelongsTo(candidate, ref),
    );
    if (!targetSource)
      fail(
        path,
        'Relation points to an undeclared GitHub repository.',
        'Declare that repository as a context source with its own coverage; preserve the endpoint URL.',
      );
  }
  if (!nonblank(nativeOf(targetSource, ref)))
    fail(
      path,
      'Relation native identity is missing.',
      'Fetch the endpoint identity; do not guess from title similarity.',
    );
  return targetSource;
}

function githubBelongsTo(source, raw) {
  try {
    const url = new URL(raw.html_url);
    return (
      `${url.host}/${url.pathname.split('/').slice(1, 3).join('/')}`.toLowerCase() ===
      source.namespace.toLowerCase()
    );
  } catch {
    return false;
  }
}
function normalizeStatus(source, raw) {
  if (source.provider === 'linear')
    return {
      label: nonblank(raw.status) ? raw.status : 'Unknown',
      type: [
        'started',
        'unstarted',
        'backlog',
        'completed',
        'canceled',
        'duplicate',
      ].includes(raw.statusType)
        ? raw.statusType
        : 'unknown',
    };
  const type =
    raw.state === 'open'
      ? 'unstarted'
      : raw.state_reason === 'completed'
        ? 'completed'
        : raw.state_reason === 'not_planned'
          ? 'canceled'
          : raw.state_reason === 'duplicate'
            ? 'duplicate'
            : 'unknown';
  return {
    label: raw.state_reason ? `${raw.state} · ${raw.state_reason}` : raw.state,
    type,
  };
}
