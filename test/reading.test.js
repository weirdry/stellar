import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  writeFile,
  readFile,
  stat,
  mkdir,
  chmod,
  lstat,
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
} from '../lib/reading.ts';
import { retainResponse } from '../lib/evidence.ts';
import { mixedCapture, mixedMap } from './fixtures.js';
import { normalizeCapture } from '../lib/normalize.ts';

const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
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

test('literal search crosses body blocks with exact Unicode locations and CLI pagination', async (t) => {
  const map = mixedMap();
  const issue = map.issues[0];
  issue.description =
    '# 🪐 Limits\r\nDo not [re]compute.*\r\n\r\n'.repeat(45) +
    'Only explain.\n\nNever recompute.';
  const query = 'Limits\r\nDo not [re]compute.*';
  let found = 0;
  let offset = 0;
  do {
    const result = searchIssue(map, issue.id, query, offset);
    assert.equal(result.total, 45);
    assert.ok(result.items.length <= 20);
    for (const match of result.items) {
      const excerpt = readIssue(map, issue.id, match.block, match.offset);
      assert.equal(
        Array.from(issue.description)
          .slice(excerpt.start, excerpt.start + Array.from(query).length)
          .join(''),
        query,
      );
      assert.ok(match.preview.startsWith(query));
      assert.equal(excerpt.text, 'Limits\r\n');
      assert.match(
        readIssue(map, issue.id, match.block + 1).text,
        /^Do not \[re\]compute\.\*/,
      );
      found++;
    }
    offset = result.nextOffset;
  } while (offset !== null);
  assert.equal(found, 45);
  const paragraph = searchIssue(map, issue.id, 'explain.\n\nNever');
  assert.equal(paragraph.total, 1);
  const at = paragraph.items[0];
  assert.equal(
    readIssue(map, issue.id, at.block, at.offset).text,
    'explain.\n\n',
  );
  assert.equal(searchIssue(map, issue.id, 'limits\r\nDo not').total, 0);

  const dir = await directory(t);
  const path = join(dir, 'map.json');
  await writeFile(path, JSON.stringify(map));
  const result = run('search-issue', path, issue.id, query, '40');
  assert.equal(result.status, 0, result.stderr);
  const page = JSON.parse(result.stdout);
  assert.equal(page.total, 45);
  assert.equal(page.items.length, 5);
  assert.equal(page.nextOffset, null);

  // Source strings may contain lone surrogates, but an astral character cannot
  // be addressed halfway through a code point by the read command.
  issue.description = '🪐A\ud800B\ude90C';
  const lone = searchIssue(map, issue.id, '\ude90');
  assert.equal(lone.total, 1);
  assert.equal(lone.items[0].offset, 4);
  assert.equal(
    readIssue(map, issue.id, 0, lone.items[0].offset).text,
    '\ude90C',
  );
});

test('reusing complete endpoint objects as context records makes their facts readable without promoting references', () => {
  for (const provider of ['linear', 'github']) {
    const capture = mixedCapture();
    const github = provider === 'github';
    const assigned = capture.records[github ? 2 : 0];
    const detail = structuredClone(capture.records[github ? 3 : 1].data);
    const sourceId = capture.records[github ? 3 : 1].sourceId;
    const body =
      'Maintain deployment credentials; do not change measurement logic.';
    if (github) {
      detail.body = body;
      detail.state = 'closed';
      detail.state_reason = 'completed';
      assigned.links = {
        blockedBy: [detail],
        children: [
          detail,
          {
            node_id: 'I_unqueried',
            number: 42,
            html_url: 'https://github.com/example/delivery/issues/42',
            title: 'Reference without detail',
          },
        ],
      };
    } else {
      detail.description = body;
      detail.status = 'Finished';
      detail.statusType = 'completed';
      delete detail.parentId;
      detail.relations = {};
      assigned.data.relations = { blocks: [detail], relatedTo: [detail] };
      assigned.links = {
        children: [{ id: 'OBS-42', title: 'Reference without detail' }],
      };
    }
    capture.records = [assigned];
    const referenceOnly = normalizeCapture(capture);
    const native = github ? detail.node_id : detail.uuid;
    assert.equal(
      referenceOnly.issues.find((i) => i.nativeId === native).detail,
      'unqueried',
    );

    // The capture assembler follows the guide: one obtained detail object,
    // one context record, regardless of how many links reference that issue.
    capture.records.push({
      sourceId,
      scope: 'context',
      data: structuredClone(detail),
    });
    const before = structuredClone(capture);
    const map = normalizeCapture(capture);
    const context = map.issues.find((i) => i.nativeId === native);
    assert.equal(context.scope, 'context');
    assert.equal(context.status.type, 'completed');
    assert.equal(context.description, body);
    assert.equal(inspectMap(map, context.id).issue.detail, 'full');
    assert.equal(readIssue(map, context.id, 0).text, body);
    assert.equal(map.issues.length, 3);
    assert.equal(map.issues.filter((i) => i.scope === 'assigned').length, 1);
    assert.deepEqual(map.relations, referenceOnly.relations);
    const unknown = map.issues.find((i) => i.detail === 'unqueried');
    assert.equal(unknown.status.type, 'unknown');
    assert.equal(inspectMap(map, unknown.id).total, 0);
    assert.deepEqual(capture, before);
  }
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

test('native null and empty bodies remain observed while omitted bodies remain absent', async (t) => {
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  let emptyHash;
  for (const [index, field] of [
    [0, 'description'],
    [2, 'body'],
  ]) {
    for (const body of [undefined, null, '']) {
      const capture = mixedCapture();
      if (body === undefined) delete capture.records[index].data[field];
      else capture.records[index].data[field] = body;
      const map = normalizeCapture(capture);
      const issue = map.issues[index];
      const present = body !== undefined;
      assert.equal(Object.hasOwn(issue, 'description'), present);
      assert.equal(issue.description, body);
      const metadata = inspectMap(map, issue.id).issue;
      assert.equal(metadata.descriptionPresent, present);
      assert.equal(metadata.descriptionCharacters, 0);
      emptyHash ??= metadata.descriptionHash;
      assert.equal(metadata.descriptionHash, emptyHash);
      assert.equal(inspectMap(map).items[index].descriptionPresent, present);
      const serialized = JSON.stringify(map);
      await writeFile(path, serialized);
      for (const args of [
        ['inspect', path, issue.id],
        ['search-issue', path, issue.id, 'missing text'],
      ]) {
        const result = run(...args);
        assert.equal(result.status, 0, result.stderr);
        const output = JSON.parse(result.stdout);
        assert.equal(output.issue.descriptionPresent, present);
        assert.equal(output.issue.descriptionHash, emptyHash);
        assert.equal(output.total, 0);
      }
      assert.equal(await readFile(path, 'utf8'), serialized);
    }
  }
});

test('body and search previews mark exact Unicode truncation boundaries', async (t) => {
  const map = mixedMap();
  const issue = map.issues[0];
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  for (const size of [79, 80, 81]) {
    issue.description = '🪐' + 'x'.repeat(size - 1);
    const before = structuredClone(map);
    const index = inspectMap(map, issue.id).items[0];
    const search = searchIssue(map, issue.id, '🪐').items[0];
    for (const item of [index, search]) {
      assert.equal(Array.from(item.preview).length, Math.min(size, 80));
      assert.equal(item.previewTruncated, size > 80);
    }
    assert.equal(index.preview, search.preview);
    assert.equal(
      readIssue(map, issue.id, search.block, search.offset).text,
      issue.description,
    );
    await writeFile(path, JSON.stringify(map));
    const result = run('search-issue', path, issue.id, '🪐');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      JSON.parse(result.stdout).items[0].previewTruncated,
      size > 80,
    );
    assert.deepEqual(map, before);
  }
  issue.description = 'long text '.repeat(20) + '\n\n🪐tail';
  const tail = searchIssue(map, issue.id, '🪐').items[0];
  assert.equal(tail.preview, '🪐tail');
  assert.equal(tail.previewTruncated, false);
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

test('response output diagnostics distinguish existing paths, invalid parents and permissions', async (t) => {
  const dir = await directory(t);
  const source = join(dir, 'private-response.json');
  const content = 'private-probe-text';
  await writeFile(source, content);
  const occupied = join(dir, 'occupied');
  await mkdir(occupied);
  const alias = join(dir, 'alias');
  const dangling = join(dir, 'dangling');
  await symlink(source, alias);
  await symlink(join(dir, 'missing'), dangling);
  const check = (output, code) => {
    const result = run('retain-response', source, output);
    assert.equal(result.status, 1, result.stderr);
    const failure = JSON.parse(result.stderr);
    assert.equal(failure.valid, false);
    assert.equal(failure.diagnostics[0].code, code);
    assert.equal(failure.diagnostics[0].path, '/output');
    assert.ok(failure.diagnostics[0].message);
    assert.ok(failure.diagnostics[0].fix);
    assert.ok(!result.stderr.includes(dir));
    assert.ok(!result.stderr.includes(content));
    return failure.diagnostics[0];
  };
  for (const output of [source, occupied, alias, dangling]) {
    const error = check(output, 'response-exists');
    assert.match(error.message, /already exists/);
    assert.match(error.fix, /fresh unused/);
  }
  // mkdir on the direct file-parent can raise EEXIST; a deeper path can raise
  // ENOTDIR. Both are a parent problem, not an occupied destination.
  for (const output of [
    join(source, 'child'),
    join(source, 'nested', 'child'),
  ]) {
    const error = check(output, 'response-parent');
    assert.match(error.message, /not a directory/);
    assert.match(error.fix, /parents are directories/);
  }
  if (process.getuid?.() !== 0) {
    const locked = join(dir, 'locked');
    await mkdir(locked);
    await chmod(locked, 0o500);
    try {
      for (const output of [
        join(locked, 'new.json'),
        join(locked, 'nested', 'new.json'),
      ]) {
        const error = check(output, 'response-permission');
        assert.match(error.message, /not writable/);
        assert.match(error.fix, /permissions/);
        await assert.rejects(lstat(output), { code: 'ENOENT' });
      }
    } finally {
      await chmod(locked, 0o700);
    }
  }
  assert.equal(await readFile(source, 'utf8'), content);
  assert.equal((await lstat(occupied)).isDirectory(), true);
  assert.equal((await lstat(alias)).isSymbolicLink(), true);
  assert.equal((await lstat(dangling)).isSymbolicLink(), true);
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
  const malformed = join(dir, 'malformed.json');
  await writeFile(malformed, '{');
  for (const args of [
    ['inspect', path, marker],
    ['inspect', join(dir, marker)],
    ['inspect', malformed],
    ['read-issue', path, id, '-1'],
    ['search-issue', path, id, ''],
    ['retain-response', join(dir, marker), join(dir, 'new.json')],
    ['retain-response', path, path],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes(marker));
    assert.ok(!result.stderr.includes(dir));
    const diagnostics = JSON.parse(result.stderr).diagnostics;
    assert.ok(diagnostics.length);
    for (const diagnostic of diagnostics) {
      assert.equal(typeof diagnostic.fix, 'string');
      assert.ok(diagnostic.fix.length > 0);
      assert.ok(!Object.hasOwn(diagnostic, 'repair'));
    }
  }
  assert.equal(run('read-issue', path, id).status, 2);
  assert.equal(await readFile(path, 'utf8'), serialized);
});
