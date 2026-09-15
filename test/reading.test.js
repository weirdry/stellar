import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  writeFile,
  readFile,
  stat,
  symlink,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  inspectMap,
  readIssue,
  searchIssue,
  bodyBlocks,
} from '../lib/reading.js';
import { retainResponse } from '../lib/evidence.js';
import { mixedCapture, mixedMap } from './fixtures.js';
import { normalizeCapture } from '../lib/normalize.js';

const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'stellar-reading-'));
  t.after(() => rm(path, { force: true, recursive: true }));
  return path;
}

test('structure-based reading reconstructs arbitrary text, CRLF, fences and multilingual headings', () => {
  const map = normalizeCapture(mixedCapture());
  const issue = map.issues[0];
  const source =
    '\r\nFreie Beschreibung\r\n==================\r\n\r\n' +
    'An unexpected purpose, without an issue template.\r\n\r\n' +
    '# 범위가 아닌 자유 제목\r\n- First item\r\n  continued text\r\n- Second item\r\n\r\n' +
    '```text\r\n# This is code, not a section\r\n```\r\n\r\n' +
    '> A quote.\r\n\r\n' +
    '🪐測定'.repeat(2000) +
    '\r\n' +
    'Late exclusion: do not recompute the measurements.\r\n';
  issue.description = source;
  const before = structuredClone(map);
  assert.equal(
    bodyBlocks(source)
      .map((b) => b.text)
      .join(''),
    source,
  );
  const index = inspectMap(map, issue.id);
  assert.ok(index.items.some((b) => b.kind === 'code'));
  assert.ok(
    !index.items.some(
      (b) => b.kind === 'heading' && b.preview.includes('This is code'),
    ),
  );
  let recovered = '';
  let page = index;
  while (true) {
    for (const block of page.items) {
      let offset = 0;
      do {
        const result = readIssue(map, issue.id, block.block, offset);
        assert.ok(Array.from(result.text).length <= 4000);
        assert.equal(
          result.text,
          Array.from(source).slice(result.start, result.end).join(''),
        );
        recovered += result.text;
        offset = result.nextOffset;
      } while (offset !== null);
    }
    if (page.nextOffset === null) break;
    page = inspectMap(map, issue.id, page.nextOffset);
  }
  assert.equal(recovered, source);
  assert.deepEqual(map, before);
});

test('index and search disclose bounded pages; late exclusions remain reachable in unheaded prose', () => {
  const map = mixedMap();
  const issue = map.issues[0];
  issue.description = Array.from(
    { length: 45 },
    (_, i) =>
      `Paragraph ${i}. ${'unrelated detail '.repeat(30)}${i === 44 ? 'EXCLUSION: explain, never calculate.' : ''}`,
  ).join('\n\n');
  const index = inspectMap(map, issue.identifier);
  assert.equal(index.items.length, 20);
  assert.equal(index.nextOffset, 20);
  assert.ok(!JSON.stringify(index).includes('EXCLUSION'));
  assert.ok(JSON.stringify(index).length < issue.description.length);
  const matches = searchIssue(map, issue.id, 'EXCLUSION');
  assert.equal(matches.total, 1);
  assert.match(
    readIssue(map, issue.id, matches.items[0].block, matches.items[0].offset)
      .text,
    /^EXCLUSION: explain, never calculate\./,
  );
  const repeated = searchIssue(map, issue.id, 'Paragraph');
  assert.equal(repeated.total, 45);
  assert.equal(repeated.nextOffset, 20);
  assert.equal(searchIssue(map, issue.id, 'Paragraph', 40).items.length, 5);
  assert.equal(searchIssue(map, issue.id, '.*').total, 0); // literal, not regex
  assert.equal(inspectMap(map, issue.id, 40).items.length, 5);
});

test('missing, empty and unknown descriptions are not inferred; stale body hashes change', () => {
  const map = mixedMap();
  const issue = map.issues[0];
  delete issue.description;
  assert.equal(inspectMap(map, issue.id).issue.descriptionPresent, false);
  assert.equal(inspectMap(map, issue.id).total, 0);
  issue.description = '';
  assert.equal(inspectMap(map, issue.id).issue.descriptionPresent, true);
  const oldHash = inspectMap(map, issue.id).issue.descriptionHash;
  issue.description = 'changed';
  assert.notEqual(inspectMap(map, issue.id).issue.descriptionHash, oldHash);
  const catalog = inspectMap(map);
  assert.ok(!JSON.stringify(catalog).includes('changed'));
  assert.throws(() => readIssue(map, issue.id, 99));
  assert.throws(() => inspectMap(map, issue.id, -1));
  assert.throws(() => readIssue(map, issue.id, 0, 99));
  assert.throws(() => searchIssue(map, issue.id, ''));
});

test('source-qualified ids resolve duplicate display identifiers and catalog pages remain bounded', () => {
  const map = mixedMap();
  const left = map.issues[0];
  const right = map.issues.find((i) => i.sourceId !== left.sourceId);
  right.identifier = left.identifier;
  assert.throws(
    () => inspectMap(map, left.identifier),
    (e) => e.diagnostics[0].path === '/issue',
  );
  assert.equal(inspectMap(map, left.id).issue.sourceId, left.sourceId);
  for (let i = 0; i < 25; i++)
    map.issues.push({
      ...left,
      id: `extra-${i}`,
      nativeId: `extra-${i}`,
      identifier: `NEW-${i}`,
    });
  assert.equal(inspectMap(map).items.length, 20);
  assert.equal(inspectMap(map, '', 20).offset, 20);
});

test('retaining a response preserves all bytes, private permissions and existing destinations', async (t) => {
  const dir = await directory(t);
  const source = join(dir, 'host-response.json');
  const dest = join(dir, 'evidence', 'raw', 'response.json');
  const content = Buffer.from(
    '{"content":[{"type":"text","text":"unmodified 🪐\\r\\nbody"}]}\n',
  );
  await writeFile(source, content);
  const result = await retainResponse(source, dest);
  assert.equal(result.bytes, content.length);
  assert.equal(result.sourceFidelity, 'not-verified');
  assert.equal((await stat(dest)).mode & 0o777, 0o600);
  assert.deepEqual(await readFile(dest), content);
  await assert.rejects(retainResponse(source, dest));
  await assert.rejects(retainResponse(source, source));
  const alias = join(dir, 'alias.json');
  await symlink(source, alias);
  await assert.rejects(retainResponse(source, alias));
  assert.deepEqual(await readFile(source), content);
  assert.deepEqual(await readFile(dest), content);
});

test('CLI supports draft inspection and private diagnostics without modifying inputs', async (t) => {
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  const draft = normalizeCapture(mixedCapture());
  draft.issues[0].description =
    '# Unusual heading\n\nOnly explains existing results.\n';
  const serialized = JSON.stringify(draft);
  await writeFile(path, serialized);
  const id = draft.issues[0].id;
  for (const args of [
    ['inspect', path],
    ['inspect', path, id],
    ['read-issue', path, id, '0'],
    ['search-issue', path, id, 'explains'],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(JSON.parse(result.stdout).kind);
  }
  const marker = 'sensitive-selection';
  for (const args of [
    ['inspect', path, marker],
    ['inspect', join(dir, marker)],
    ['read-issue', path, id, '-1'],
    ['retain-response', join(dir, marker), join(dir, 'new.json')],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes(marker));
    assert.ok(!result.stderr.includes(dir));
    assert.ok(JSON.parse(result.stderr).diagnostics.length);
  }
  assert.equal(run('read-issue', path, id).status, 2);
  assert.equal(await readFile(path, 'utf8'), serialized);
});
