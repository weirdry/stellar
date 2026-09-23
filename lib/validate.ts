import { Ajv } from 'ajv';
import { loadSchema, schemaProperty, required } from './contracts.ts';
import type { WorkMap, Diagnostic } from './contracts.ts';
import addFormats from 'ajv-formats';

const schema = loadSchema(
  new URL('../schemas/work-map.schema.json', import.meta.url),
);
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats.default(ajv);
const checkShape = ajv.compile<WorkMap>(schema);

// A reference can navigate to a web page or a colocated document. It cannot
// execute a URL scheme, escape the report directory, or fetch an image on open.
export function safeAttachmentURL(value: string) {
  if (/^https?:\/\//.test(value)) {
    try {
      const url = new URL(value);
      return !url.username && !url.password;
    } catch {
      return false;
    }
  }
  try {
    const path = decodeURIComponent(value);
    return (
      !/[:\\?#\s]/.test(path) &&
      ![...path].some((char) => char.charCodeAt(0) < 32) &&
      !path.startsWith('/') &&
      path.split('/').every((part) => part && part !== '.' && part !== '..')
    );
  } catch {
    return false;
  }
}

function evaluateWorkMap(data: unknown) {
  const diagnostics: Diagnostic[] = [];
  const add = (code: string, path: string, message: string, fix: string) =>
    diagnostics.push({ code, path, message, fix });
  if (!checkShape(data)) {
    for (const error of checkShape.errors ?? []) {
      const property = schemaProperty(error);
      add(
        'schema',
        (error.instancePath || '') + (property ? '/' + property : '') || '/',
        error.message ?? '',
        'Match the field to schemas/work-map.schema.json; do not fabricate missing source facts.',
      );
    }
    return { valid: false, diagnostics, map: undefined };
  }
  const index = <T extends { id: string }>(items: T[], path: string) => {
    const map = new Map<string, T>();
    items.forEach((item, n) => {
      if (map.has(item.id))
        add(
          'duplicate-id',
          `${path}/${n}/id`,
          'Identity occurs more than once.',
          'Keep one authoritative entry for this identity.',
        );
      map.set(item.id, item);
    });
    return map;
  };
  const domains = index(data.domains, '/domains');
  const categories = index(data.categories, '/categories');
  const issues = index(data.issues, '/issues');
  const sources = index(data.sources, '/sources');
  const namespaces = new Set(),
    nativeIds = new Set();
  data.sources.forEach((source, n) => {
    if (
      source.provider === 'github' &&
      (source.namespace !== source.namespace.toLowerCase() ||
        !/^[^/\s]+\/[^/\s]+\/[^/\s]+$/.test(source.namespace))
    )
      add(
        'source-namespace',
        `/sources/${n}/namespace`,
        'GitHub namespace must be lowercase host/owner/repository.',
        'Use the canonical repository namespace, without a scheme or trailing slash.',
      );
    const key = JSON.stringify([source.provider, source.namespace]);
    if (namespaces.has(key))
      add(
        'duplicate-source',
        `/sources/${n}/namespace`,
        'This provider namespace has already been declared.',
        'Combine captures from the same workspace or repository into one source.',
      );
    namespaces.add(key);
  });
  data.categories.forEach((category, n) => {
    if (!domains.has(category.domain))
      add(
        'unknown-domain',
        `/categories/${n}/domain`,
        'Domain does not exist.',
        'Reference an existing domain or declare it.',
      );
  });
  data.issues.forEach((issue, n) => {
    const path = `/issues/${n}`;
    if (!sources.has(issue.sourceId))
      add(
        'unknown-source',
        path + '/sourceId',
        'Issue source does not exist.',
        'Declare the source workspace or repository and reference its id.',
      );
    const nativeKey = JSON.stringify([issue.sourceId, issue.nativeId]);
    if (nativeIds.has(nativeKey))
      add(
        'duplicate-native-id',
        path + '/nativeId',
        'Source issue occurs more than once.',
        'Keep one issue for this source and native identity; identifiers may repeat across sources.',
      );
    nativeIds.add(nativeKey);
    if (issue.scope === 'assigned' && !issue.classification)
      add(
        'missing-classification',
        path + '/classification',
        'In-scope issue has no primary classification.',
        'Assign one existing category with rationale and origin.',
      );
    if (issue.classification && !categories.has(issue.classification.category))
      add(
        'unknown-category',
        path + '/classification/category',
        'Category does not exist.',
        'Reference an existing category or declare it.',
      );
    if (
      issue.classificationEvidence &&
      (!issue.classification || issue.detail !== 'unqueried')
    )
      add(
        'classification-evidence',
        path + '/classificationEvidence',
        'Previous-observation evidence requires a classified, unqueried issue.',
        'Let refresh set this interpretation notice; do not change source detail to retain it.',
      );
    if (issue.detail === 'unqueried' && issue.status.type !== 'unknown')
      add(
        'unqueried-status',
        path + '/status/type',
        'Unqueried detail cannot claim a known status.',
        'Keep status unknown or obtain source detail and mark it full.',
      );
    if (issue.url && !safeAttachmentURL(issue.url))
      add(
        'unsafe-url',
        path + '/url',
        'Source URLs must be valid HTTP(S) URLs without credentials.',
        'Use the normal HTTP(S) issue page URL.',
      );
  });
  const seen = new Set(),
    parents = new Map<string, string>(),
    parentPaths = new Map<string, string>();
  data.relations.forEach((edge, n) => {
    const path = `/relations/${n}`;
    for (const key of ['source', 'target'] as const)
      if (!issues.has(edge[key]))
        add(
          'unknown-endpoint',
          path + '/' + key,
          'Relation endpoint does not exist.',
          'Declare the context issue explicitly; use detail unqueried and status unknown when not fetched.',
        );
    if (edge.source === edge.target)
      add(
        'self-relation',
        path,
        'A relation cannot connect an issue to itself.',
        'Remove the self-relation or correct its endpoints from source evidence.',
      );
    const ends =
      edge.kind === 'related'
        ? [edge.source, edge.target].sort()
        : [edge.source, edge.target];
    const identity = [edge.kind, ...ends].join('|');
    if (seen.has(identity))
      add(
        'duplicate-relation',
        path,
        'Relation is repeated (related is undirected).',
        'Keep one entry; blocks and parent retain source direction.',
      );
    seen.add(identity);
    if (edge.kind === 'parent') {
      if (parents.has(edge.target) && parents.get(edge.target) !== edge.source)
        add(
          'multiple-parents',
          path,
          'Issue has more than one source parent.',
          'Resolve the source parent; classification is separate.',
        );
      parents.set(edge.target, edge.source);
      parentPaths.set(edge.target, path);
    }
  });
  // Parent links are a hierarchy; other registered relationships may have cycles.
  let parentCycle = false;
  for (const id of parents.keys()) {
    const path = new Set();
    let at = id;
    while (parents.has(at)) {
      if (path.has(at)) {
        add(
          'parent-cycle',
          required(
            parentPaths.get(at),
            'Parent path is recorded with its edge.',
          ),
          'Source parent hierarchy contains a cycle.',
          'Correct parent direction or endpoints against the source.',
        );
        parentCycle = true;
        break;
      }
      path.add(at);
      at = required(parents.get(at), 'Parent edge exists in this traversal.');
    }
    if (parentCycle) break;
  }
  (data.attachments || []).forEach((attachment, n) => {
    if (!safeAttachmentURL(attachment.href))
      add(
        'unsafe-attachment',
        `/attachments/${n}/href`,
        'Reference URL is not a safe web or report-relative path.',
        'Use HTTP(S) without credentials or a relative file below the report directory.',
      );
  });
  return { valid: diagnostics.length === 0, diagnostics, map: data };
}

export class WorkMapError extends Error {
  diagnostics: Diagnostic[];
  constructor(diagnostics: Diagnostic[]) {
    super('Invalid work map');
    this.name = 'WorkMapError';
    this.diagnostics = diagnostics;
  }
}

export function validateWorkMap(data: unknown) {
  const { valid, diagnostics } = evaluateWorkMap(data);
  return { valid, diagnostics };
}

export function assertWorkMap(data: unknown, allowPending = false): WorkMap {
  const result = evaluateWorkMap(data);
  const diagnostics = allowPending
    ? result.diagnostics.filter(
        (item) => item.code !== 'missing-classification',
      )
    : result.diagnostics;
  if (diagnostics.length || !result.map) throw new WorkMapError(diagnostics);
  return result.map;
}
