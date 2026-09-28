import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual as equal } from 'node:util';
import { assertState, refreshState } from './continuity.ts';
import { required } from './contracts.ts';
import type { Identity, Issue, Memory, WorkMap } from './contracts.ts';
import { WorkMapError } from './validate.ts';

const PAGE = 20;
const CHUNK = 4000;
const CONTEXT = 160;
const key = ({ provider, namespace, nativeId }: Identity) =>
  JSON.stringify([provider, namespace, nativeId]);
const sourceOf = (map: WorkMap, issue: Issue) =>
  required(
    map.sources.find((source) => source.id === issue.sourceId),
    'Validated source exists.',
  );
const identityOf = (map: WorkMap, issue: Issue): Identity => ({
  provider: sourceOf(map, issue).provider,
  namespace: sourceOf(map, issue).namespace,
  nativeId: issue.nativeId,
});
const textOf = (issue: Pick<Issue, 'title' | 'description'>) => ({
  title: issue.title,
  ...(issue.description !== undefined
    ? { description: issue.description }
    : {}),
});
type Evidence = NonNullable<Memory['evidence']>;
const FIELDS = ['title', 'description'] as const;
function fieldChanged(
  before: Evidence | undefined,
  after: Evidence | undefined,
  field: (typeof FIELDS)[number],
  savedBaseline: boolean,
): boolean | null {
  if (before === undefined || after === undefined) return null;
  // Saved memory collapses null descriptions to omission. Compare at that
  // fidelity without changing the exact presence, hashes or text we expose.
  return savedBaseline && field === 'description'
    ? !equal(before[field] ?? undefined, after[field] ?? undefined)
    : !equal(before[field], after[field]);
}
function fail(path: string, message: string, fix: string): never {
  throw new WorkMapError([{ code: 'refresh-reading', path, message, fix }]);
}
export async function readRefreshInput(
  path: string,
  role: 'state' | 'capture',
): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    fail(
      `/${role}`,
      'Refresh input could not be read.',
      'Use an accessible previous state and the retained fresh capture.',
    );
  }
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    fail(
      `/${role}`,
      'Refresh input is not valid JSON.',
      'Repair the input JSON without replacing retained evidence.',
    );
  }
}
function offsetOf(value: string | number) {
  if (
    !/^(0|[1-9]\d*)$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value))
  )
    fail(
      '/offset',
      'Expected a non-negative integer.',
      'Use the nextOffset returned for this view.',
    );
  return Number(value);
}
function page<T>(items: T[], offset: number) {
  if (offset > items.length)
    fail(
      '/offset',
      'Offset is beyond this view.',
      'Restart at offset 0 with unchanged inputs and view.',
    );
  const end = Math.min(items.length, offset + PAGE);
  return {
    total: items.length,
    offset,
    nextOffset: end < items.length ? end : null,
    items: items.slice(offset, end),
  };
}

// One contiguous change window per field: exact common prefix/suffix, no semantic
// normalization or quadratic edit matrix. Distant edits can retain a large middle.
function windows(before: string[], after: string[]) {
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start++;
  let left = before.length,
    right = after.length;
  while (
    left > start &&
    right > start &&
    before[left - 1] === after[right - 1]
  ) {
    left--;
    right--;
  }
  return {
    before: {
      start: Math.max(0, start - CONTEXT),
      end: Math.min(before.length, left + CONTEXT),
    },
    after: {
      start: Math.max(0, start - CONTEXT),
      end: Math.min(after.length, right + CONTEXT),
    },
  };
}

export function readRefresh(
  input: unknown,
  capture: unknown,
  selector = '',
  view = 'focus',
  offsetInput: string | number = 0,
) {
  const offset = offsetOf(offsetInput);
  if (!['focus', 'full', 'taxonomy'].includes(view))
    fail(
      '/view',
      'Unknown refresh reading view.',
      'Choose focus, full, or taxonomy.',
    );
  const previous = assertState(input);
  // Reuse the authoritative refresh policy without writing a run or decisions.
  const current = refreshState(previous, capture);
  if (view === 'taxonomy') {
    if (selector)
      fail(
        '/issue',
        'Taxonomy view does not take an issue.',
        'Use an empty issue selector for taxonomy paging.',
      );
    return {
      kind: 'refresh-taxonomy' as const,
      ...page(
        previous.map.categories.map((category) => ({
          ...category,
          domain: previous.map.domains.find(
            (domain) => domain.id === category.domain,
          ),
        })),
        offset,
      ),
    };
  }
  const memories = new Map(previous.memory.map((entry) => [key(entry), entry]));
  const observations = new Map(
    previous.map.issues.map((issue) => [
      key(identityOf(previous.map, issue)),
      issue,
    ]),
  );
  const reviews = new Map(
    current.changes.review.map((entry) => [entry.issueId, entry.reason]),
  );
  const candidates = current.map.issues.flatMap((issue) => {
    const identity = identityOf(current.map, issue),
      stable = key(identity);
    const saved = memories.get(stable),
      observed = observations.get(stable);
    // Pending agent review keeps its decision baseline across refreshes. For
    // user decisions, prefer the exact last full observation (including null).
    const useObservation =
      saved?.classification?.origin === 'user' && observed?.detail === 'full';
    const before = useObservation ? textOf(observed) : saved?.evidence;
    const after = issue.detail === 'full' ? textOf(issue) : undefined;
    const reason = reviews.get(issue.id);
    const userObservation =
      saved?.classification?.origin === 'user' && after !== undefined;
    const changedUser =
      userObservation &&
      FIELDS.some(
        (field) => fieldChanged(before, after, field, !useObservation) === true,
      );
    const availableUser = userObservation && before === undefined;
    if (!reason && !changedUser && !availableUser) return [];
    return [
      {
        issue,
        identity,
        saved,
        before,
        after,
        reason,
        baseline: useObservation
          ? 'previous-full-observation'
          : before
            ? saved?.classification
              ? 'saved-decision-evidence'
              : 'saved-observation'
            : 'unavailable',
        attention: changedUser
          ? 'preserved-user-evidence-changed'
          : availableUser
            ? 'preserved-user-evidence-available'
            : 'pending-classification',
      },
    ];
  });
  if (!selector) {
    if (view !== 'focus')
      fail(
        '/issue',
        'Full evidence requires an issue.',
        'Choose an issue from the focus index.',
      );
    return {
      kind: 'refresh-index' as const,
      ...page(
        candidates.map(({ issue, identity, reason, attention }) => ({
          id: issue.id,
          identifier: issue.identifier,
          identity,
          scope: issue.scope,
          detail: issue.detail,
          titlePreview: Array.from(issue.title).slice(0, 80).join(''),
          titleTruncated: Array.from(issue.title).length > 80,
          attention,
          reviewReason: reason ?? null,
        })),
        offset,
      ),
    };
  }
  const exact = current.map.issues.find((issue) => issue.id === selector);
  const matches = exact
    ? [exact]
    : current.map.issues.filter((issue) => issue.identifier === selector);
  if (matches.length !== 1)
    fail(
      '/issue',
      'Issue selection is missing or ambiguous.',
      'Use the canonical issue id from the refresh index.',
    );
  const selected = candidates.find(({ issue }) => issue.id === matches[0]?.id);
  if (!selected)
    fail(
      '/issue',
      'Issue has no focused refresh attention.',
      'Use an issue from the refresh index; read other observations with the existing map readers.',
    );
  const { issue, identity, saved, before, after, reason, attention, baseline } =
    selected;
  const fields = FIELDS.map((field) => {
    const left = Array.from(before?.[field] ?? ''),
      right = Array.from(after?.[field] ?? '');
    const changed = fieldChanged(
      before,
      after,
      field,
      baseline !== 'previous-full-observation',
    );
    const ranges = windows(left, right);
    const side = (
      name: 'before' | 'after',
      evidence: Evidence | undefined,
      points: string[],
    ) => {
      const value = evidence?.[field];
      const range =
        view === 'full' ||
        !saved?.classification ||
        before === undefined ||
        after === undefined
          ? { start: 0, end: points.length }
          : changed
            ? ranges[name]
            : { start: 0, end: 0 };
      return {
        name,
        points,
        range,
        summary: {
          available: evidence !== undefined,
          presence:
            evidence === undefined
              ? 'unavailable'
              : value === undefined
                ? 'omitted'
                : value === null
                  ? 'null'
                  : 'text',
          characters: points.length,
          hash:
            evidence === undefined
              ? null
              : createHash('sha256')
                  .update(JSON.stringify({ field, value }))
                  .digest('hex'),
          selected: range,
          omitted: [
            ...(range.start ? [{ start: 0, end: range.start }] : []),
            ...(range.end < points.length
              ? [{ start: range.end, end: points.length }]
              : []),
          ],
        },
      };
    };
    return {
      field,
      changed,
      sides: [
        side('before', before, left),
        side('after', after, right),
      ] as const,
    };
  });
  // Count chunk descriptors, then materialize only this page's exact text.
  const chunks = fields.flatMap(({ field, sides }) =>
    sides.flatMap(({ name, points, range }) => {
      const entries: {
        field: string;
        side: string;
        points: string[];
        start: number;
        end: number;
      }[] = [];
      for (let at = range.start; at < range.end; at += CHUNK)
        entries.push({
          field,
          side: name,
          points,
          start: at,
          end: Math.min(at + CHUNK, range.end),
        });
      return entries;
    }),
  );
  const chunkPage = page(chunks, offset);
  const category = previous.map.categories.find(
    (entry) => entry.id === saved?.classification?.category,
  );
  return {
    kind: 'refresh-evidence' as const,
    view,
    issue: {
      id: issue.id,
      identifier: issue.identifier,
      identity,
      scope: issue.scope,
      detail: issue.detail,
      status: issue.status,
    },
    source: sourceOf(current.map, issue),
    attention,
    reviewReason: reason ?? null,
    previousDecision: saved
      ? {
          classification: saved.classification ?? null,
          targets: saved.targets,
          targetsOrigin: saved.targetsOrigin,
        }
      : null,
    category: category
      ? {
          ...category,
          domain: previous.map.domains.find(
            (domain) => domain.id === category.domain,
          ),
        }
      : null,
    baseline,
    currentEvidence: after ? 'current-full-observation' : 'unavailable',
    fields: fields.map(({ field, changed, sides }) => ({
      field,
      changed,
      before: sides[0].summary,
      after: sides[1].summary,
    })),
    ...chunkPage,
    items: chunkPage.items.map(({ points, ...chunk }) => ({
      ...chunk,
      text: points.slice(chunk.start, chunk.end).join(''),
    })),
  };
}
