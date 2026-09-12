import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { assertWorkMap, validateWorkMap, WorkMapError } from './validate.js';

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
  // Validate shared metadata before source indexing can hide duplicate IDs or
  // cause valid native records to be interpreted against an invalid namespace.
  assertWorkMap(map);
  const sources = new Map(capture.sources.map((source) => [source.id, source]));
  const aliases = new Map(),
    records = [];
  // These paths describe the caller's capture, not the transient work-map draft.
  const origins = new Map([
    ['/issues', '/records'],
    ['/relations', '/records'],
  ]);
  const capturePath = (path) => {
    for (
      let prefix = path;
      prefix;
      prefix = prefix.slice(0, prefix.lastIndexOf('/'))
    )
      if (origins.has(prefix)) return origins.get(prefix);
    return path; // Shared metadata already has the same path in both contracts.
  };
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
      assertGithubUrl(raw, path + '/data');
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
  const identify = (source, ref, path) => {
    const native =
      aliases.get(aliasKey(source, nativeOf(source, ref))) ||
      nativeOf(source, ref);
    const id = keyOf(source.id, native);
    if (!identities.has(id))
      identities.set(id, { id, source, native, refs: [] });
    const identity = identities.get(id);
    identity.refs.push({ ref, path });
    return identity;
  };
  for (const record of records) {
    record.identity = identify(
      record.source,
      record.entry.data,
      record.path + '/data',
    );
    for (const relation of record.relations)
      relation.identity = identify(
        relation.source,
        relation.ref,
        relation.path,
      );
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
    const issuePath = `/issues/${map.issues.length}`;
    origins.set(issuePath, path + '/data');
    for (const field of ['sourceId', 'scope'])
      origins.set(`${issuePath}/${field}`, `${path}/${field}`);
    origins.set(issuePath + '/title', path + '/data/title');
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
    const copy = (target, value, field = target) => {
      if (value !== undefined) {
        issue[target] = structuredClone(value);
        origins.set(`${issuePath}/${target}`, `${path}/data/${field}`);
      }
    };
    copy(
      'url',
      source.provider === 'linear' ? raw.url : raw.html_url,
      source.provider === 'linear' ? 'url' : 'html_url',
    );
    copy(
      'description',
      source.provider === 'linear' ? raw.description : raw.body,
      source.provider === 'linear' ? 'description' : 'body',
    );
    copy(
      'updatedAt',
      source.provider === 'linear' ? raw.updatedAt : raw.updated_at,
      source.provider === 'linear' ? 'updatedAt' : 'updated_at',
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
      for (const field of ['assignees', 'labels'])
        if (raw[field] !== undefined && !Array.isArray(raw[field]))
          fail(
            `${path}/data/${field}`,
            'GitHub metadata collection is not an array.',
            'Preserve the native REST array; omit unavailable metadata instead of supplying a malformed collection.',
          );
      copy(
        'assignee',
        raw.assignees
          ?.map((assignee, index) => {
            if (
              !assignee ||
              typeof assignee !== 'object' ||
              Array.isArray(assignee) ||
              !nonblank(assignee.login)
            )
              fail(
                `${path}/data/assignees/${index}`,
                'GitHub assignee must be a user object with a nonblank login.',
                'Preserve each native REST user object and its login field.',
              );
            return assignee.login;
          })
          .join(', ') || null,
        'assignees',
      );
      copy(
        'labels',
        raw.labels?.map((label, index) => {
          const name =
            typeof label === 'string'
              ? label
              : label && typeof label === 'object' && !Array.isArray(label)
                ? label.name
                : undefined;
          if (!nonblank(name))
            fail(
              `${path}/data/labels/${index}`,
              'GitHub label must be a nonblank string or an object with a nonblank name.',
              'Preserve each native REST label string or label object and its name field.',
            );
          return name;
        }),
      );
      copy(
        'completedAt',
        raw.state_reason === 'completed' ? raw.closed_at : undefined,
        'closed_at',
      );
    }
    map.issues.push(issue);
  }
  for (const { id, source, native, refs } of identities.values()) {
    if (fullIds.has(id)) continue;
    // Prefer observed display identifiers to bare native IDs. Choose metadata
    // deterministically when several endpoint observations describe one issue.
    const firstText = (values) => values.filter(nonblank).sort()[0];
    const displays = refs.map(({ ref }) => displayOf(source, ref));
    const identifier =
      firstText(displays.filter((value) => value !== native)) || native;
    const firstRef = (field) =>
      refs
        .filter(({ ref }) => nonblank(ref[field]))
        .toSorted((a, b) =>
          a.ref[field] < b.ref[field]
            ? -1
            : a.ref[field] > b.ref[field]
              ? 1
              : 0,
        )[0];
    const title = firstRef('title');
    const issuePath = `/issues/${map.issues.length}`;
    origins.set(issuePath, refs[0].path);
    if (title) origins.set(issuePath + '/title', title.path + '/title');
    const context = {
      id,
      sourceId: source.id,
      nativeId: native,
      identifier,
      title: title?.ref.title || identifier,
      scope: 'context',
      detail: 'unqueried',
      status: {
        type: 'unknown',
        label: capture.locale === 'ko' ? '미조회' : 'Not queried',
      },
      targets: [],
    };
    const urlField = source.provider === 'linear' ? 'url' : 'html_url';
    const url = firstRef(urlField);
    if (url) {
      context.url = url.ref[urlField];
      origins.set(issuePath + '/url', `${url.path}/${urlField}`);
    }
    map.issues.push(context);
  }
  const edges = new Set();
  const addEdge = (kind, source, target, path) => {
    const ends =
      kind === 'related' ? [source, target].sort() : [source, target];
    const key = JSON.stringify([kind, ...ends]);
    if (!edges.has(key)) {
      origins.set(`/relations/${map.relations.length}`, path);
      map.relations.push({ kind, source: ends[0], target: ends[1] });
    }
    edges.add(key);
  };
  for (const { identity, relations } of records)
    for (const { kind, reverse, identity: other, path } of relations)
      addEdge(
        kind,
        reverse ? other.id : identity.id,
        reverse ? identity.id : other.id,
        path,
      );
  // Drafts intentionally lack interpretation, but every source-fact invariant
  // must pass before writing. Rendering still requires all classifications.
  const diagnostics = validateWorkMap(map)
    .diagnostics.filter((d) => d.code !== 'missing-classification')
    .map((d) => ({ ...d, path: capturePath(d.path) }));
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
    assertGithubUrl(ref, path);
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

function assertGithubUrl(raw, path) {
  if (
    !nonblank(raw.html_url) ||
    !/^https?:\/\//.test(raw.html_url) ||
    !URL.canParse(raw.html_url)
  )
    fail(
      path + '/html_url',
      'GitHub html_url is missing or malformed.',
      'Preserve the absolute HTTP(S) html_url from the native REST issue response before resolving its repository.',
    );
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
