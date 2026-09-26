import { objectJSON, array, record } from './support.ts';
import { failure as readFailure } from './support.ts';
import { getDiagnostics } from './support.ts';
import { must } from './support.ts';
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
  inspectMap as inspect,
  readIssue,
  searchIssue,
  bodyBlocks,
} from '../lib/reading.ts';
import { retainResponse } from '../lib/evidence.ts';
import { mixedCapture, mixedMap } from './fixtures.ts';
import { normalizeCapture } from '../lib/normalize.ts';

function inspectMap(map: unknown, selector: string, offset?: number) {
  const result = inspect(map, selector, offset);
  assert.ok('issue' in result);
  return result;
}
function inspectCatalog(map: unknown, offset?: number) {
  const result = inspect(map, '', offset);
  assert.ok(!('issue' in result));
  return result;
}
const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
const run = (...args: string[]) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
async function directory(t: test.TestContext) {
  const path = await mkdtemp(join(tmpdir(), 'stellar-reading-'));
  t.after(() => rm(path, { force: true, recursive: true }));
  return path;
}

void test('structure-based reading reconstructs arbitrary text, CRLF, fences and multilingual headings', () => {
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
  must(issue).description = source;
  const before = structuredClone(map);
  assert.equal(
    bodyBlocks(source)
      .map((b) => b.text)
      .join(''),
    source,
  );
  const index = inspectMap(map, must(issue).id);
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
      let offset: number | null = 0;
      do {
        const result = readIssue(map, must(issue).id, block.block, offset);
        assert.ok(Array.from(result.text).length <= 4000);
        assert.equal(
          result.text,
          Array.from(source).slice(result.start, result.end).join(''),
        );
        recovered += result.text;
        offset = result.nextOffset;
      } while (offset !== null);
    }
    if (page['nextOffset'] === null) break;
    page = inspectMap(map, must(issue).id, page.nextOffset);
  }
  assert.equal(recovered, source);
  assert.deepEqual(map, before);
});

void test('index and search disclose bounded pages; late exclusions remain reachable in unheaded prose', () => {
  const map = mixedMap();
  const issue = map.issues[0];
  must(issue).description = Array.from(
    { length: 45 },
    (_, i) =>
      `Paragraph ${i}. ${'unrelated detail '.repeat(30)}${i === 44 ? 'EXCLUSION: explain, never calculate.' : ''}`,
  ).join('\n\n');
  const index = inspectMap(map, must(issue).identifier);
  assert.equal(index.items.length, 20);
  assert.equal(index.nextOffset, 20);
  assert.ok(!JSON.stringify(index).includes('EXCLUSION'));
  assert.ok(
    JSON.stringify(index).length < must(must(issue).description).length,
  );
  const matches = searchIssue(map, must(issue).id, 'EXCLUSION');
  assert.equal(matches.total, 1);
  assert.match(
    readIssue(
      map,
      must(issue).id,
      must(matches.items[0]).block,
      must(matches.items[0]).offset,
    ).text,
    /^EXCLUSION: explain, never calculate\./,
  );
  const repeated = searchIssue(map, must(issue).id, 'Paragraph');
  assert.equal(repeated.total, 45);
  assert.equal(repeated.nextOffset, 20);
  assert.equal(
    searchIssue(map, must(issue).id, 'Paragraph', 40).items.length,
    5,
  );
  assert.equal(searchIssue(map, must(issue).id, '.*').total, 0); // literal, not regex
  assert.equal(inspectMap(map, must(issue).id, 40).items.length, 5);
});

void test('literal search crosses body blocks with exact Unicode locations and CLI pagination', async (t) => {
  const map = mixedMap();
  const issue = map.issues[0];
  must(issue).description =
    '# 🪐 Limits\r\nDo not [re]compute.*\r\n\r\n'.repeat(45) +
    'Only explain.\n\nNever recompute.';
  const query = 'Limits\r\nDo not [re]compute.*';
  let found = 0;
  let offset: number | null = 0;
  do {
    const result = searchIssue(map, must(issue).id, query, offset);
    assert.equal(result.total, 45);
    assert.ok(result.items.length <= 20);
    for (const match of result.items) {
      const excerpt = readIssue(map, must(issue).id, match.block, match.offset);
      assert.equal(
        Array.from(must(must(issue).description))
          .slice(excerpt.start, excerpt.start + Array.from(query).length)
          .join(''),
        query,
      );
      assert.ok(match.preview.startsWith(query));
      assert.equal(excerpt.text, 'Limits\r\n');
      assert.match(
        readIssue(map, must(issue).id, match.block + 1).text,
        /^Do not \[re\]compute\.\*/,
      );
      found++;
    }
    offset = result.nextOffset;
  } while (offset !== null);
  assert.equal(found, 45);
  const paragraph = searchIssue(map, must(issue).id, 'explain.\n\nNever');
  assert.equal(paragraph.total, 1);
  const at = paragraph.items[0];
  assert.equal(
    readIssue(map, must(issue).id, must(at).block, must(at).offset).text,
    'explain.\n\n',
  );
  assert.equal(searchIssue(map, must(issue).id, 'limits\r\nDo not').total, 0);

  const dir = await directory(t);
  const path = join(dir, 'map.json');
  await writeFile(path, JSON.stringify(map));
  const result = run('search-issue', path, must(issue).id, query, '40');
  assert.equal(result.status, 0, result.stderr);
  const page = objectJSON(result.stdout);
  assert.equal(page['total'], 45);
  assert.equal(array(page['items']).length, 5);
  assert.equal(page['nextOffset'], null);

  // Source strings may contain lone surrogates, but an astral character cannot
  // be addressed halfway through a code point by the read command.
  must(issue).description = '🪐A\ud800B\ude90C';
  const lone = searchIssue(map, must(issue).id, '\ude90');
  assert.equal(lone.total, 1);
  assert.equal(must(lone.items[0]).offset, 4);
  assert.equal(
    readIssue(map, must(issue).id, 0, must(lone.items[0]).offset).text,
    '\ude90C',
  );
});

void test('reusing complete endpoint objects as context records makes their facts readable without promoting references', () => {
  for (const provider of ['linear', 'github']) {
    const capture = mixedCapture();
    const github = provider === 'github';
    const assigned = capture.records[github ? 2 : 0];
    const detail = structuredClone(must(capture.records[github ? 3 : 1]).data);
    const sourceId = must(capture.records[github ? 3 : 1]).sourceId;
    const body =
      'Maintain deployment credentials; do not change measurement logic.';
    if (github) {
      detail.body = body;
      detail['state'] = 'closed';
      detail['state_reason'] = 'completed';
      must(assigned).links = {
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
      detail['status'] = 'Finished';
      detail['statusType'] = 'completed';
      delete detail.parentId;
      detail.relations = {};
      must(assigned).data.relations = { blocks: [detail], relatedTo: [detail] };
      must(assigned).links = {
        children: [{ id: 'OBS-42', title: 'Reference without detail' }],
      };
    }
    capture.records = [must(assigned)];
    const referenceOnly = normalizeCapture(capture);
    const native = github ? detail.node_id : detail.uuid;
    assert.equal(
      must(referenceOnly.issues.find((i) => i.nativeId === native)).detail,
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
    assert.equal(must(context).scope, 'context');
    assert.equal(must(context).status.type, 'completed');
    assert.equal(must(context).description, body);
    assert.equal(inspectMap(map, must(context).id).issue.detail, 'full');
    assert.equal(readIssue(map, must(context).id, 0).text, body);
    assert.equal(map.issues.length, 3);
    assert.equal(map.issues.filter((i) => i.scope === 'assigned').length, 1);
    assert.deepEqual(map.relations, referenceOnly.relations);
    const unknown = map.issues.find((i) => i.detail === 'unqueried');
    assert.equal(must(unknown).status.type, 'unknown');
    assert.equal(inspectMap(map, must(unknown).id).total, 0);
    assert.deepEqual(capture, before);
  }
});

void test('missing, empty and unknown descriptions are not inferred; stale body hashes change', () => {
  const map = mixedMap();
  const issue = map.issues[0];
  delete must(issue).description;
  assert.equal(inspectMap(map, must(issue).id).issue.descriptionPresent, false);
  assert.equal(inspectMap(map, must(issue).id).total, 0);
  must(issue).description = '';
  assert.equal(inspectMap(map, must(issue).id).issue.descriptionPresent, true);
  const oldHash = inspectMap(map, must(issue).id).issue.descriptionHash;
  must(issue).description = 'changed';
  assert.notEqual(
    inspectMap(map, must(issue).id).issue.descriptionHash,
    oldHash,
  );
  const catalog = inspectCatalog(map);
  assert.ok(!JSON.stringify(catalog).includes('changed'));
  assert.throws(() => readIssue(map, must(issue).id, 99));
  assert.throws(() => inspectMap(map, must(issue).id, -1));
  assert.throws(() => readIssue(map, must(issue).id, 0, 99));
  assert.throws(() => searchIssue(map, must(issue).id, ''));
});

void test('native null and empty bodies remain observed while omitted bodies remain absent', async (t) => {
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  let emptyHash;
  for (const [index, field] of [
    [0, 'description'],
    [2, 'body'],
  ] as const) {
    for (const body of [undefined, null, '']) {
      const capture = mixedCapture();
      if (body === undefined) delete must(capture.records[index]).data[field];
      else must(capture.records[index]).data[field] = body;
      const map = normalizeCapture(capture);
      const issue = map.issues[index];
      const present = body !== undefined;
      assert.equal(Object.hasOwn(must(issue), 'description'), present);
      assert.equal(must(issue).description, body);
      const metadata = inspectMap(map, must(issue).id).issue;
      assert.equal(metadata.descriptionPresent, present);
      assert.equal(metadata.descriptionCharacters, 0);
      emptyHash ??= metadata.descriptionHash;
      assert.equal(metadata.descriptionHash, emptyHash);
      assert.equal(
        must(inspectCatalog(map).items[index]).descriptionPresent,
        present,
      );
      const serialized = JSON.stringify(map);
      await writeFile(path, serialized);
      for (const args of [
        ['inspect', path, must(issue).id],
        ['search-issue', path, must(issue).id, 'missing text'],
      ]) {
        const result = run(...args);
        assert.equal(result.status, 0, result.stderr);
        const output = objectJSON(result.stdout);
        assert.equal(record(output['issue'])['descriptionPresent'], present);
        assert.equal(record(output['issue'])['descriptionHash'], emptyHash);
        assert.equal(output['total'], 0);
      }
      assert.equal(await readFile(path, 'utf8'), serialized);
    }
  }
});

void test('body and search previews mark exact Unicode truncation boundaries', async (t) => {
  const map = mixedMap();
  const issue = map.issues[0];
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  for (const size of [79, 80, 81]) {
    must(issue).description = '🪐' + 'x'.repeat(size - 1);
    const before = structuredClone(map);
    const index = inspectMap(map, must(issue).id).items[0];
    const search = searchIssue(map, must(issue).id, '🪐').items[0];
    for (const item of [index, search]) {
      assert.equal(Array.from(must(item).preview).length, Math.min(size, 80));
      assert.equal(must(item).previewTruncated, size > 80);
    }
    assert.equal(must(index).preview, must(search).preview);
    assert.equal(
      readIssue(map, must(issue).id, must(search).block, must(search).offset)
        .text,
      must(issue).description,
    );
    await writeFile(path, JSON.stringify(map));
    const result = run('search-issue', path, must(issue).id, '🪐');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      record(array(objectJSON(result.stdout)['items'])[0])['previewTruncated'],
      size > 80,
    );
    assert.deepEqual(map, before);
  }
  must(issue).description = 'long text '.repeat(20) + '\n\n🪐tail';
  const tail = searchIssue(map, must(issue).id, '🪐').items[0];
  assert.equal(must(tail).preview, '🪐tail');
  assert.equal(must(tail).previewTruncated, false);
});

void test('source-qualified ids resolve duplicate display identifiers and catalog pages remain bounded', () => {
  const map = mixedMap();
  const left = map.issues[0];
  const right = map.issues.find((i) => i.sourceId !== must(left).sourceId);
  must(right).identifier = must(left).identifier;
  assert.throws(
    () => inspectMap(map, must(left).identifier),
    (e) => must(getDiagnostics(e)[0]).path === '/issue',
  );
  assert.equal(
    inspectMap(map, must(left).id).issue.sourceId,
    must(left).sourceId,
  );
  for (let i = 0; i < 25; i++)
    map.issues.push({
      ...must(left),
      id: `extra-${i}`,
      nativeId: `extra-${i}`,
      identifier: `NEW-${i}`,
    });
  assert.equal(inspectCatalog(map).items.length, 20);
  assert.equal(inspectCatalog(map, 20).offset, 20);
});

void test('retaining a response preserves all bytes, private permissions and existing destinations', async (t) => {
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

void test('response output diagnostics distinguish existing paths, invalid parents and permissions', async (t) => {
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
  const check = (output: string, code: string) => {
    const result = run('retain-response', source, output);
    assert.equal(result.status, 1, result.stderr);
    const failure = readFailure(result.stderr);
    assert.equal(failure.valid, false);
    assert.equal(must(failure.diagnostics[0]).code, code);
    assert.equal(must(failure.diagnostics[0]).path, '/output');
    assert.ok(must(failure.diagnostics[0]).message);
    assert.ok(must(failure.diagnostics[0]).fix);
    assert.ok(!result.stderr.includes(dir));
    assert.ok(!result.stderr.includes(content));
    return failure.diagnostics[0];
  };
  for (const output of [source, occupied, alias, dangling]) {
    const error = check(output, 'response-exists');
    assert.match(must(error).message, /already exists/);
    assert.match(must(error).fix, /fresh unused/);
  }
  // mkdir on the direct file-parent can raise EEXIST; a deeper path can raise
  // ENOTDIR. Both are a parent problem, not an occupied destination.
  for (const output of [
    join(source, 'child'),
    join(source, 'nested', 'child'),
  ]) {
    const error = check(output, 'response-parent');
    assert.match(must(error).message, /not a directory/);
    assert.match(must(error).fix, /parents are directories/);
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
        assert.match(must(error).message, /not writable/);
        assert.match(must(error).fix, /permissions/);
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

void test('CLI supports draft inspection and private diagnostics without modifying inputs', async (t) => {
  const dir = await directory(t);
  const path = join(dir, 'map.json');
  const draft = normalizeCapture(mixedCapture());
  must(draft.issues[0]).description =
    '# Unusual heading\n\nOnly explains existing results.\n';
  const serialized = JSON.stringify(draft);
  await writeFile(path, serialized);
  const id = must(draft.issues[0]).id;
  for (const args of [
    ['inspect', path],
    ['inspect', path, id],
    ['read-issue', path, id, '0'],
    ['search-issue', path, id, 'explains'],
  ]) {
    const result = run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(objectJSON(result.stdout)['kind']);
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
    const diagnostics = readFailure(result.stderr).diagnostics;
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
