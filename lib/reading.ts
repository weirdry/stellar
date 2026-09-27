import { required, isArray, isObject } from './contracts.ts';
import { readFile } from 'node:fs/promises';
import type { WorkMap, Issue } from './contracts.ts';
import { createHash } from 'node:crypto';
import { assertWorkMap, WorkMapError } from './validate.ts';
import { readWorkMap } from './render.ts';

const PAGE = 20;
const PREVIEW = 80;
const CHUNK = 4000;
const characters = (text: string) => Array.from(text);
const preview = (text: string) => {
  const points = characters(text);
  return {
    preview: points.slice(0, PREVIEW).join(''),
    previewTruncated: points.length > PREVIEW,
  };
};

function fail(path: string, message: string, fix: string): never {
  throw new WorkMapError([{ path, code: 'reading', message, fix }]);
}

function number(value: unknown, path: string) {
  if (
    !/^(0|[1-9]\d*)$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value))
  )
    fail(
      path,
      'Expected a non-negative integer.',
      'Use an offset returned by the reader.',
    );
  return Number(value);
}

export async function readReadingMap(path: string) {
  try {
    return await readWorkMap(path);
  } catch (error) {
    if (error instanceof WorkMapError) throw error;
    fail(
      '/input',
      'Work-map input could not be read.',
      'Use an accessible normalized draft or final map file.',
    );
  }
}

function select(map: WorkMap, selector: unknown) {
  const exact = map.issues.find((issue) => issue.id === selector);
  if (exact) return exact;
  const matches = map.issues.filter((issue) => issue.identifier === selector);
  if (matches.length !== 1)
    fail(
      '/issue',
      'Issue selection is missing or ambiguous.',
      'Inspect the map and use its canonical issue id.',
    );
  return required(matches[0], 'A unique issue selection exists.');
}

function metadata(issue: Issue, length?: number) {
  const body = issue.description ?? '';
  return {
    id: issue.id,
    identifier: issue.identifier,
    sourceId: issue.sourceId,
    title: issue.title,
    scope: issue.scope,
    detail: issue.detail,
    status: issue.status,
    descriptionPresent: issue.description !== undefined,
    descriptionCharacters: length ?? characters(body).length,
    descriptionHash: createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex'),
  };
}

// Structural navigation only: every character is retained, with no ranking by
// heading name, language, provider, or presumed purpose. This is not a Markdown renderer.
export function bodyBlocks(text: string) {
  const lines = (text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g) ?? []).filter(Boolean);
  const blocks: { kind: string; text: string }[] = [];
  let current: { kind: string; text: string } | undefined;
  let fence: string | undefined;
  let blank = false;
  for (const line of lines) {
    if (fence && current) {
      current.text += line;
      const close = line.trim();
      if (
        close.length >= fence.length &&
        [...close].every((c) => c === fence?.[0])
      ) {
        fence = undefined;
        current = undefined;
      }
      continue;
    }
    if (!line.trim() && current) {
      current.text += line;
      blank = true;
      continue;
    }
    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    const setext =
      /^ {0,3}(?:=+|-+)\s*$/.test(line) &&
      current?.kind === 'paragraph' &&
      !blank;
    if (setext && current) {
      current.kind = 'heading';
      current.text += line;
      current = undefined;
      continue;
    }
    const kind = opening
      ? 'code'
      : /^ {0,3}#{1,6}(?:\s|$)/.test(line)
        ? 'heading'
        : /^\s*(?:[-+*]|\d+[.)])\s/.test(line)
          ? 'list'
          : /^\s*>/.test(line)
            ? 'quote'
            : 'paragraph';
    const continuation = current?.kind === 'list' && /^\s+\S/.test(line);
    if (
      !current ||
      blank ||
      opening ||
      kind === 'heading' ||
      (kind !== current.kind && !continuation)
    ) {
      current = { kind, text: '' };
      blocks.push(current);
    }
    current.text += line;
    blank = false;
    if (opening) fence = opening[1];
    else if (kind === 'heading') current = undefined;
  }
  let position = 0;
  return blocks.map((block, index) => {
    const start = position;
    position += characters(block.text).length;
    return {
      block: index,
      kind: block.kind,
      start,
      end: position,
      text: block.text,
    };
  });
}

function page<T>(items: T[], offset: number) {
  if (offset > items.length)
    fail(
      '/offset',
      'Offset is beyond the available entries.',
      'Restart the index at offset 0.',
    );
  const end = Math.min(items.length, offset + PAGE);
  return {
    total: items.length,
    offset,
    nextOffset: end < items.length ? end : null,
    items: items.slice(offset, end),
  };
}

export function inspectMap(
  input: unknown,
  selector?: unknown,
  offset: string | number = 0,
) {
  const map = assertWorkMap(input, true);
  offset = number(offset, '/offset');
  if (!selector)
    return {
      kind: 'issues',
      ...page(
        map.issues.map((issue) => metadata(issue)),
        offset,
      ),
    };
  const issue = select(map, selector);
  const blocks = bodyBlocks(issue.description ?? '').map(
    ({ text, ...block }) => ({
      ...block,
      ...preview(text),
    }),
  );
  return {
    kind: 'body-index',
    issue: metadata(issue),
    ...page(blocks, offset),
  };
}

export function readBody(
  input: unknown,
  selector: unknown,
  offset: string | number = 0,
) {
  const map = assertWorkMap(input, true);
  offset = number(offset, '/offset');
  const issue = select(map, selector);
  const text = characters(issue.description ?? '');
  if (offset > text.length)
    fail(
      '/offset',
      'Offset is beyond this body.',
      'Use the returned nextOffset or restart at 0 after the body changes.',
    );
  const end = Math.min(offset + CHUNK, text.length);
  return {
    kind: 'body-text',
    issue: metadata(issue),
    start: offset,
    end,
    offset,
    nextOffset: end < text.length ? end : null,
    text: text.slice(offset, end).join(''),
  };
}

export function readIssue(
  input: unknown,
  selector: unknown,
  blockInput: unknown,
  offset: string | number = 0,
) {
  const map = assertWorkMap(input, true);
  const block = number(blockInput, '/block');
  offset = number(offset, '/offset');
  const issue = select(map, selector);
  const selected = bodyBlocks(issue.description ?? '')[block];
  if (!selected)
    fail(
      '/block',
      'Body block does not exist.',
      'Inspect this issue and choose an available block.',
    );
  const text = characters(selected.text);
  if (offset > text.length)
    fail(
      '/offset',
      'Offset is beyond this block.',
      "Use this block's returned nextOffset.",
    );
  const end = Math.min(offset + CHUNK, text.length);
  return {
    kind: 'body-excerpt',
    issue: metadata(issue),
    block,
    start: selected.start + offset,
    end: selected.start + end,
    offset,
    nextOffset: end < text.length ? end : null,
    text: text.slice(offset, end).join(''),
  };
}

// Request files are transient read plans, not saved work-map/state contracts.
export async function readBatchRequests(path: string): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    fail(
      '/requests',
      'Batch request file could not be read.',
      'Use an accessible JSON request file.',
    );
  }
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    fail(
      '/requests',
      'Batch request file is not valid JSON.',
      'Supply an array of issue selections with optional block and offset numbers.',
    );
  }
}

export function readBatch(
  input: unknown,
  requests: unknown,
  offset: string | number = 0,
) {
  const map = assertWorkMap(input, true);
  offset = number(offset, '/offset');
  if (!isArray(requests))
    fail(
      '/requests',
      'Expected a batch request array.',
      'Supply an array of objects containing issue, optional block, and optional offset.',
    );
  if (offset > requests.length)
    fail(
      '/offset',
      'Offset is beyond the available requests.',
      'Restart the request page at offset 0.',
    );

  const byId = new Map(map.issues.map((issue) => [issue.id, issue]));
  const byIdentifier = new Map<string, Issue | null>();
  for (const issue of map.issues)
    byIdentifier.set(
      issue.identifier,
      byIdentifier.has(issue.identifier) ? null : issue,
    );
  const cache = new Map<
    string,
    {
      issue: Issue;
      points: string[];
      blocks?: ReturnType<typeof bodyBlocks>;
    }
  >();

  // Validate the entire plan before returning any evidence, including later pages.
  // Only returned chunks are materialized; preparation is shared by canonical ID.
  const plan = requests.map((request, index) => {
    const path = `/requests/${index}`;
    if (
      !isObject(request) ||
      isArray(request) ||
      Object.keys(request).some(
        (key) => !['issue', 'block', 'offset'].includes(key),
      )
    )
      fail(
        path,
        'Expected an issue selection with no unknown fields.',
        'Use only issue, optional block, and optional offset.',
      );
    const selector = request['issue'];
    if (typeof selector !== 'string' || !selector.length)
      fail(
        `${path}/issue`,
        'Expected an issue selector.',
        'Use a canonical issue id or an unambiguous display identifier.',
      );
    const issue = byId.get(selector) ?? byIdentifier.get(selector);
    if (!issue)
      fail(
        `${path}/issue`,
        'Issue selection is missing or ambiguous.',
        'Inspect the map and use its canonical issue id.',
      );
    const integer = (key: 'block' | 'offset') => {
      const value = request[key];
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < 0
      )
        fail(
          `${path}/${key}`,
          'Expected a non-negative integer number.',
          'Use a numeric block from inspect or an offset returned by the reader.',
        );
      return value;
    };
    const block = request['block'] === undefined ? undefined : integer('block');
    const at = request['offset'] === undefined ? 0 : integer('offset');
    let prepared = cache.get(issue.id);
    if (!prepared) {
      prepared = { issue, points: characters(issue.description ?? '') };
      cache.set(issue.id, prepared);
    }
    let start = 0,
      length = prepared.points.length;
    if (block !== undefined) {
      prepared.blocks ??= bodyBlocks(issue.description ?? '');
      const selected = prepared.blocks[block];
      if (!selected)
        fail(
          `${path}/block`,
          'Body block does not exist.',
          'Inspect this issue and choose an available block.',
        );
      start = selected.start;
      length = selected.end - selected.start;
    }
    if (at > length)
      fail(
        `${path}/offset`,
        'Offset is beyond the selected text.',
        'Use this selection’s nextOffset or restart after the source text changes.',
      );
    return { request: index, prepared, block, at, start, length };
  });

  const selected = page(plan, offset);
  const issues: ReturnType<typeof metadata>[] = [];
  const indices = new Map<string, number>();
  const items = selected.items.map(
    ({ request, prepared, block, at, start, length }) => {
      let issueIndex = indices.get(prepared.issue.id);
      if (issueIndex === undefined) {
        issueIndex = issues.length;
        indices.set(prepared.issue.id, issueIndex);
        issues.push(metadata(prepared.issue, prepared.points.length));
      }
      const end = Math.min(at + CHUNK, length);
      return {
        request,
        issueIndex,
        kind: block === undefined ? 'body-text' : 'body-excerpt',
        ...(block === undefined ? {} : { block }),
        start: start + at,
        end: start + end,
        offset: at,
        nextOffset: end < length ? end : null,
        text: prepared.points.slice(start + at, start + end).join(''),
      };
    },
  );
  return {
    kind: 'batch-excerpts',
    total: selected.total,
    offset,
    nextOffset: selected.nextOffset,
    issues,
    items,
  };
}

export function searchIssue(
  input: unknown,
  selector: unknown,
  query: unknown,
  offset: string | number = 0,
) {
  const map = assertWorkMap(input, true);
  offset = number(offset, '/offset');
  if (typeof query !== 'string' || !query.length)
    fail(
      '/query',
      'Search text is empty.',
      'Supply literal source text to locate, not a regular expression.',
    );
  const issue = select(map, selector);
  const body = issue.description ?? '';
  const blocks = bodyBlocks(body);
  const matches = [];
  let total = 0;
  let from = 0;
  let position = 0;
  let block = 0;
  const queryLength = characters(query).length;
  // Match literal text across structural boundaries. Unicode mode prevents
  // matching half of an astral character, which has no code-point offset.
  for (const match of body.matchAll(new RegExp(RegExp.escape(query), 'gu'))) {
    const at = match.index;
    position += characters(body.slice(from, at)).length;
    while (
      required(blocks[block], 'Search match belongs to a body block.').end <=
      position
    )
      block++;
    if (total >= offset && matches.length < PAGE)
      matches.push({
        block,
        offset:
          position -
          required(blocks[block], 'Search match belongs to a body block.')
            .start,
        ...preview(body.slice(at)),
      });
    total++;
    position += queryLength;
    from = at + query.length;
  }
  if (offset > total)
    fail(
      '/offset',
      'Offset is beyond the search results.',
      'Restart this search at offset 0.',
    );
  return {
    kind: 'literal-matches',
    issue: metadata(issue),
    total,
    offset,
    nextOffset:
      offset + matches.length < total ? offset + matches.length : null,
    items: matches,
  };
}
