import { createHash } from 'node:crypto';
import { validateWorkMap, WorkMapError } from './validate.js';
import { readWorkMap } from './render.js';

const PAGE = 20;
const PREVIEW = 80;
const CHUNK = 4000;
const characters = (text) => Array.from(text);
const preview = (text) => {
  const points = characters(text);
  return {
    preview: points.slice(0, PREVIEW).join(''),
    previewTruncated: points.length > PREVIEW,
  };
};

function fail(path, message, fix) {
  throw new WorkMapError([{ path, code: 'reading', message, fix }]);
}

function number(value, path) {
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

function check(map) {
  const errors = validateWorkMap(map).diagnostics.filter(
    (error) => error.code !== 'missing-classification',
  );
  if (errors.length) throw new WorkMapError(errors);
}

export async function readReadingMap(path) {
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

function select(map, selector) {
  const exact = map.issues.find((issue) => issue.id === selector);
  if (exact) return exact;
  const matches = map.issues.filter((issue) => issue.identifier === selector);
  if (matches.length !== 1)
    fail(
      '/issue',
      'Issue selection is missing or ambiguous.',
      'Inspect the map and use its canonical issue id.',
    );
  return matches[0];
}

function metadata(issue) {
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
    descriptionCharacters: characters(body).length,
    descriptionHash: createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex'),
  };
}

// Structural navigation only: every character is retained, with no ranking by
// heading name, language, provider, or presumed purpose. This is not a Markdown renderer.
export function bodyBlocks(text) {
  const lines = text.match(/[^\r\n]*(?:\r\n|\n|\r|$)/g).filter(Boolean);
  const blocks = [];
  let current;
  let fence;
  let blank = false;
  for (const line of lines) {
    if (fence) {
      current.text += line;
      const close = line.trim();
      if (
        close.length >= fence.length &&
        [...close].every((c) => c === fence[0])
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
    if (setext) {
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

function page(items, offset) {
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

export function inspectMap(map, selector, offset = 0) {
  check(map);
  offset = number(offset, '/offset');
  if (!selector)
    return { kind: 'issues', ...page(map.issues.map(metadata), offset) };
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

export function readIssue(map, selector, block, offset = 0) {
  check(map);
  block = number(block, '/block');
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

export function searchIssue(map, selector, query, offset = 0) {
  check(map);
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
    while (blocks[block].end <= position) block++;
    if (total >= offset && matches.length < PAGE)
      matches.push({
        block,
        offset: position - blocks[block].start,
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
