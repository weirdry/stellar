import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readBatch, readBody, readIssue, bodyBlocks } from '../lib/reading.ts';
import { normalizeCapture } from '../lib/normalize.ts';
import { mixedCapture, mixedMap } from './fixtures.ts';
import { must, getDiagnostics, objectJSON, array, record } from './support.ts';

type Request = { issue: string; block?: number; offset?: number };
function expanded(batch: ReturnType<typeof readBatch>) {
  return batch.items.map(({ request, issueIndex, ...excerpt }) => ({
    request,
    result: { ...excerpt, issue: must(batch.issues[issueIndex]) },
  }));
}

void test('batch pages preserve exact individual results, order and source-qualified metadata without mutating drafts', () => {
  const draft = normalizeCapture(mixedCapture());
  const a = must(draft.issues[0]),
    b = must(draft.issues[1]);
  a.description =
    '# Heading\r\n\r\n' +
    '🪐e\u0301\t\0'.repeat(1800) +
    '\r\n# Later\r\nDo not recompute.\ud800';
  b.description = 'Another body.\r\n';
  const requests: Request[] = [
    { issue: a.id },
    { issue: a.identifier, offset: 4000 },
    { issue: a.id, block: 1 },
    { issue: a.id, block: 1, offset: 4000 },
    ...bodyBlocks(a.description).map(({ block }) => ({ issue: a.id, block })),
    ...Array.from({ length: 24 }, () => ({ issue: b.id })),
  ];
  const before = structuredClone({ draft, requests });
  let offset: number | null = 0;
  let count = 0;
  do {
    const batch = readBatch(draft, requests, offset);
    assert.equal(batch.total, requests.length);
    assert.ok(batch.items.length <= 20);
    assert.equal(
      new Set(batch.issues.map((i) => i.id)).size,
      batch.issues.length,
    );
    assert.equal(
      batch.issues.length,
      new Set(batch.items.map((i) => i.issueIndex)).size,
    );
    for (const { request, result } of expanded(batch)) {
      assert.equal(request, count++);
      const r = must(requests[request]);
      const expected =
        r.block === undefined
          ? readBody(draft, r.issue, r.offset)
          : readIssue(draft, r.issue, r.block, r.offset);
      assert.deepEqual(result, expected);
      assert.ok(Array.from(result.text).length <= 4000);
    }
    offset = batch.nextOffset;
  } while (offset !== null);
  assert.equal(count, requests.length);
  assert.deepEqual({ draft, requests }, before);
  assert.deepEqual(readBatch(draft, requests, requests.length).items, []);
});

void test('multi-page plans reuse issues across pages with exact individual text, lengths and astral/lone-surrogate offsets', () => {
  const map = mixedMap();
  const bodies = [
    '# 🪐 Heading\n\n' + '🪐測é '.repeat(1500) + '\n\n- item\n  more\n',
    'lone \ud800 high, lone \udc00 low, reversed \udc00\ud800, pair 🪐\ud83e',
    '',
    null,
    undefined,
  ];
  const issues = map.issues.slice(0, bodies.length);
  assert.equal(issues.length, bodies.length);
  for (const [index, issue] of issues.entries()) {
    const body = bodies[index];
    if (body === undefined) delete issue.description;
    else issue.description = body;
  }
  const unique = (issue: (typeof issues)[number]) =>
    map.issues.filter((other) => other.identifier === issue.identifier)
      .length === 1
      ? issue.identifier
      : issue.id;
  const requests: Request[] = [];
  for (let round = 0; round < 3; round++)
    for (const issue of issues) {
      const text = issue.description ?? '';
      const length = Array.from(text).length;
      requests.push(
        { issue: issue.id },
        { issue: unique(issue), offset: length },
        { issue: issue.id, offset: Math.min(4000, length) },
      );
      for (const { block, text: blockText } of bodyBlocks(text))
        requests.push(
          { issue: issue.id, block },
          { issue: issue.id, block, offset: Array.from(blockText).length },
        );
    }
  const before = structuredClone({ map, requests });
  let offset: number | null = 0,
    seen = 0;
  do {
    const batch = readBatch(map, requests, offset);
    for (const metadata of batch.issues) {
      const source = must(issues.find((issue) => issue.id === metadata.id));
      assert.equal(
        metadata.descriptionCharacters,
        Array.from(source.description ?? '').length,
      );
    }
    for (const { request, result } of expanded(batch)) {
      assert.equal(request, seen++);
      const r = must(requests[request]);
      assert.deepEqual(
        result,
        r.block === undefined
          ? readBody(map, r.issue, r.offset)
          : readIssue(map, r.issue, r.block, r.offset),
      );
    }
    offset = batch.nextOffset;
  } while (offset !== null);
  assert.equal(seen, requests.length);
  assert.ok(requests.length > 40);
  assert.deepEqual({ map, requests }, before);
  // Block boundaries count code points exactly, including unpaired surrogates.
  for (const issue of issues) {
    let position = 0;
    for (const block of bodyBlocks(issue.description ?? '')) {
      assert.equal(block.start, position);
      position += Array.from(block.text).length;
      assert.equal(block.end, position);
    }
  }
});

void test('off-page selections are validated against exact code-point lengths before any page is returned', () => {
  const map = mixedMap(),
    [a, b] = map.issues;
  const first = must(a),
    second = must(b);
  first.description = '🪐'.repeat(5000) + '\n\n# Later 🪐\n';
  second.description = 'short 🪐 \ud800';
  const bodyLength = Array.from(first.description).length;
  const blocks = bodyBlocks(first.description);
  const lastBlock = must(blocks.at(-1));
  const blockLength = Array.from(lastBlock.text).length;
  const page = Array.from({ length: 20 }, () => ({ issue: second.id }));
  const valid: Request[] = [
    ...page,
    { issue: first.id, offset: bodyLength },
    { issue: first.id, block: lastBlock.block, offset: blockLength },
    { issue: second.id, offset: 9 },
  ];
  // Exact code-point ends are accepted even when they are off the returned page.
  assert.equal(readBatch(map, valid).items.length, 20);
  assert.deepEqual(
    readBatch(map, valid, 20).items.map((item) => [item.text, item.nextOffset]),
    [
      ['', null],
      ['', null],
      ['', null],
    ],
  );
  const cases: [Request[], string][] = [
    // UTF-16 lengths would accept these offsets; code-point lengths do not.
    [
      [...page, { issue: first.id, offset: bodyLength + 1 }],
      '/requests/20/offset',
    ],
    [
      [
        ...page,
        { issue: first.id, block: lastBlock.block, offset: blockLength + 1 },
      ],
      '/requests/20/offset',
    ],
    [[...page, { issue: second.id, offset: 10 }], '/requests/20/offset'],
    [
      [...page, { issue: first.id, block: blocks.length }],
      '/requests/20/block',
    ],
    // The first invalid request is reported, even when later ones also fail.
    [
      [
        ...page,
        { issue: first.id, block: 0 },
        { issue: second.id, offset: 99 },
        { issue: 'missing' },
      ],
      '/requests/21/offset',
    ],
  ];
  for (const [requests, path] of cases)
    for (const offset of [0, 20])
      assert.throws(
        () => readBatch(map, requests, offset),
        (error: unknown) => {
          const diagnostics = getDiagnostics(error);
          assert.equal(diagnostics.length, 1);
          assert.equal(must(diagnostics[0]).path, path);
          return true;
        },
      );
});

void test('batch body and block continuation reconstruct complete text including chunk-edge CRLF and Unicode', () => {
  const map = mixedMap(),
    issue = must(map.issues[0]);
  issue.description =
    'x'.repeat(3999) + '\r\n' + '🪐'.repeat(4000) + '\u0301\ud800';
  for (const block of [undefined, 0]) {
    let at: number | null = 0,
      recovered = '';
    do {
      const request: Request = {
        issue: issue.id,
        offset: at,
        ...(block === undefined ? {} : { block }),
      };
      const batch = readBatch(map, [request]);
      assert.equal(batch.nextOffset, null); // Request pagination is distinct from chunk continuation.
      const item = must(batch.items[0]);
      assert.equal(item.offset, at);
      recovered += item.text;
      at = item.nextOffset;
    } while (at !== null);
    assert.equal(recovered, issue.description);
  }
  for (const body of [null, '', undefined]) {
    if (body === undefined) delete issue.description;
    else issue.description = body;
    const batch = readBatch(map, [{ issue: issue.id }]);
    assert.deepEqual(must(expanded(batch)[0]).result, readBody(map, issue.id));
    assert.equal(must(batch.issues[0]).descriptionPresent, body !== undefined);
  }
  assert.deepEqual(readBatch(map, []), {
    kind: 'batch-excerpts',
    total: 0,
    offset: 0,
    nextOffset: null,
    issues: [],
    items: [],
  });
});

void test('batch rejects the whole plan with indexed private diagnostics, including invalid later pages', () => {
  const map = mixedMap(),
    issue = must(map.issues[0]);
  const marker = 'private-selector-or-field';
  must(map.issues[1]).identifier = issue.identifier;
  const cases: [unknown, string][] = [
    [{}, '/requests'],
    [[null], '/requests/0'],
    [[[]], '/requests/0'],
    [[{ issue: issue.id, [marker]: marker }], '/requests/0'],
    [[{}], '/requests/0/issue'],
    [[{ issue: 1 }], '/requests/0/issue'],
    [[{ issue: marker }], '/requests/0/issue'],
    [[{ issue: issue.identifier }], '/requests/0/issue'],
    [[{ issue: issue.id, block: 999 }], '/requests/0/block'],
    [[{ issue: issue.id, offset: 99999 }], '/requests/0/offset'],
    [
      [
        ...Array.from({ length: 20 }, () => ({ issue: issue.id })),
        { issue: marker },
      ],
      '/requests/20/issue',
    ],
  ];
  for (const key of ['offset', 'block'])
    for (const value of [-1, 1.5, '0', null, true, Number.MAX_SAFE_INTEGER + 1])
      cases.push([[{ issue: issue.id, [key]: value }], `/requests/0/${key}`]);
  for (const [requests, path] of cases)
    assert.throws(
      () => readBatch(map, requests),
      (error: unknown) => {
        const diagnostics = getDiagnostics(error);
        assert.equal(must(diagnostics[0]).path, path);
        assert.ok(must(diagnostics[0]).fix);
        assert.ok(!JSON.stringify(diagnostics).includes(marker));
        return true;
      },
    );
  for (const offset of [-1, '', '1.5', 2])
    assert.throws(() => readBatch(map, [{ issue: issue.id }], offset));
  assert.equal(
    must(readBatch(map, [{ issue: issue.id }]).issues[0]).id,
    issue.id,
  );
  // A canonical ID retains precedence over someone else's display identifier.
  must(map.issues[1]).identifier = issue.id;
  assert.equal(
    must(readBatch(map, [{ issue: issue.id }]).issues[0]).id,
    issue.id,
  );
});

void test('shared metadata reduces a selective multi-excerpt payload while expanding losslessly', (t) => {
  const map = mixedMap(),
    requests: Request[] = [];
  for (const issue of map.issues.slice(0, 3)) {
    issue.description =
      '# Scope\n\nMeasure synthetic drift.\n\n# Exclusions\n\nDo not recompute observations.\n';
    for (const block of [0, 1, 3]) requests.push({ issue: issue.id, block });
  }
  const singles = requests.map((r) => readIssue(map, r.issue, r.block, 0));
  const batch = readBatch(map, requests);
  assert.deepEqual(
    expanded(batch).map((entry) => entry.result),
    singles,
  );
  const separateBytes = singles.reduce(
    (sum, result) =>
      sum + Buffer.byteLength(JSON.stringify(result, null, 2) + '\n'),
    0,
  );
  const batchBytes = Buffer.byteLength(JSON.stringify(batch, null, 2) + '\n');
  assert.ok(batchBytes < separateBytes);
  t.diagnostic(
    JSON.stringify({
      separateBytes,
      batchBytes,
      separateCalls: singles.length,
      batchCalls: 1,
      metric: 'serialized UTF-8 bytes, not tokens',
    }),
  );
});

void test('source and bundled batch CLIs return identical pages and never emit partial success for bad plans', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-batch-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const map = normalizeCapture(mixedCapture()),
    issue = must(map.issues[0]);
  const input = join(dir, 'map.json'),
    requests = join(dir, 'requests.json');
  const serialized = JSON.stringify(map);
  await writeFile(input, serialized);
  const plan = Array.from({ length: 23 }, () => ({ issue: issue.id }));
  for (const entry of ['../bin/stellar.ts', '../bin/stellar.mjs']) {
    const cli = fileURLToPath(new URL(entry, import.meta.url));
    const run = (...args: string[]) =>
      spawnSync(process.execPath, [cli, 'read-batch', ...args], {
        encoding: 'utf8',
      });
    await writeFile(requests, JSON.stringify(plan));
    for (const offset of [0, 20]) {
      const result = run(input, requests, String(offset));
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(objectJSON(result.stdout), readBatch(map, plan, offset));
    }
    assert.equal(await readFile(requests, 'utf8'), JSON.stringify(plan));
    for (const raw of [
      '{private-body',
      JSON.stringify([...plan, { issue: 'private-body' }]),
    ]) {
      await writeFile(requests, raw);
      const result = run(input, requests);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, '');
      assert.ok(!result.stderr.includes('private-body'));
      assert.ok(
        array(objectJSON(result.stderr)['diagnostics']).every(
          (d) => record(d)['fix'],
        ),
      );
    }
    const missing = run(input, join(dir, 'private-path'));
    assert.equal(missing.status, 1);
    assert.ok(!missing.stderr.includes('private-path'));
    assert.equal(run(input).status, 2);
    assert.equal(run(input, requests, '0', 'extra').status, 2);
    assert.equal(run(input, '--help').status, 2);
  }
  assert.equal(await readFile(input, 'utf8'), serialized);
});

void test('batch metadata distinguishes colliding source identifiers and never survives into a later invocation', () => {
  const map = mixedMap();
  const collision = map.issues.filter((issue) => issue.identifier === '#7');
  assert.equal(collision.length, 2);
  const requests = collision.map((issue) => ({ issue: issue.id }));
  const first = readBatch(map, requests);
  assert.equal(first.issues.length, 2);
  assert.notEqual(
    must(first.issues[0]).sourceId,
    must(first.issues[1]).sourceId,
  );
  assert.throws(() => readBatch(map, [{ issue: '#7' }]));
  const changed = must(collision[0]);
  changed.description = 'New evidence changes the purpose.';
  const next = readBatch(map, requests);
  assert.notEqual(
    must(first.issues[0]).descriptionHash,
    must(next.issues[0]).descriptionHash,
  );
  assert.equal(must(next.items[0]).text, changed.description);
  assert.deepEqual(must(next.issues[1]), must(first.issues[1]));
});
