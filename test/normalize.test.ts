import { objectJSON } from './support.ts';
import { failure as readFailure } from './support.ts';
import { property } from '../lib/contracts.ts';
import type { WorkMap } from '../lib/contracts.ts';
import type { TestCapture } from './fixtures.ts';
import { must } from './support.ts';
import { getDiagnostics } from './support.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeCapture } from '../lib/normalize.ts';
import { validateWorkMap } from '../lib/validate.ts';
import { mixedCapture, mixedMap } from './fixtures.ts';
import type { StellarWorkMap } from '../types/generated/work-map.js';

const rejected = (mutate: (capture: TestCapture) => void, pattern: RegExp) => {
  const capture = mixedCapture();
  mutate(capture);
  assert.throws(
    () => normalizeCapture(capture),
    (error) =>
      getDiagnostics(error).some((d) => pattern.test(d.message) && d.fix),
  );
};
void test('the purpose exercise capture normalizes to its documented scope without fixing a taxonomy', async () => {
  const capture: unknown = JSON.parse(
    await readFile(
      new URL('../examples/purpose-capture.json', import.meta.url),
      'utf8',
    ),
  );
  const before = structuredClone(capture);
  const map = normalizeCapture(capture);
  assert.deepEqual(capture, before);
  assert.equal(
    map.issues.filter((issue) => issue.scope === 'assigned').length,
    7,
  );
  const context = map.issues.filter((issue) => issue.scope === 'context');
  assert.equal(context.length, 1);
  assert.equal(must(context[0]).detail, 'unqueried');
  assert.equal(must(context[0]).status.type, 'unknown');
  assert.equal(map.relations.length, 3);
  const result = validateWorkMap(map);
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.length, 7);
  assert.ok(
    result.diagnostics.every((d) => d.code === 'missing-classification'),
  );
});
void test('mixed native records preserve facts, resolve Linear aliases and distinguish repository-local issue numbers', () => {
  const capture = mixedCapture(),
    before = structuredClone(capture);
  const map = normalizeCapture(capture);
  assert.deepEqual(capture, before);
  assert.deepEqual(map, normalizeCapture(capture));
  assert.equal(map.issues.length, 5);
  const [linear, child, control, delivery, closed] = map.issues;
  assert.equal(must(linear).nativeId, must(capture.records[0]).data.uuid);
  assert.equal(must(linear).title, must(capture.records[0]).data.title);
  assert.equal(
    must(linear).description,
    must(capture.records[0]).data.description,
  );
  assert.deepEqual(must(linear).status, {
    type: 'started',
    label: 'Investigating',
  });
  assert.equal(must(control).identifier, must(delivery).identifier);
  assert.notEqual(must(control).id, must(delivery).id);
  assert.equal(must(control).status.type, 'unstarted');
  assert.equal(must(closed).status.type, 'canceled');
  assert.equal(
    map.relations.length,
    3,
    'outgoing/incoming observations of one blocker deduplicate',
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' &&
        e.source === must(linear).id &&
        e.target === must(child).id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'parent' &&
        e.source === must(linear).id &&
        e.target === must(child).id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' &&
        e.source === must(delivery).id &&
        e.target === must(control).id,
    ),
  );
  assert.ok(
    validateWorkMap(map).diagnostics.every(
      (d) => d.code === 'missing-classification',
    ),
  );
  assert.equal(validateWorkMap(mixedMap()).valid, true);
});
void test('unfetched relation endpoints stay context with unknown status, without inventing inferred edges', () => {
  const capture = mixedCapture();
  must(must(capture.records[0]).data.relations).relatedTo = [
    { id: 'OBS-99', title: 'Unfetched spectral study' },
  ];
  must(must(capture.records[0]).data.relations).duplicateOf = { id: 'OBS-100' };
  must(capture.records[1]).data.description =
    'Same words and URL mention as another issue.';
  const map = normalizeCapture(capture),
    unknown = map.issues.find((i) => i.identifier === 'OBS-99');
  assert.equal(must(unknown).scope, 'context');
  assert.equal(must(unknown).detail, 'unqueried');
  assert.equal(must(unknown).status.type, 'unknown');
  assert.equal(map.relations.length, 5);
  assert.ok(
    map.relations.some(
      (e) => e.kind === 'duplicate' && e.source === must(map.issues[0]).id,
    ),
  );
});
void test('normalization rejects contradictory identity, malformed references and false complete coverage', () => {
  rejected((c) => c.records.push(must(c.records[0])), /more than once/);
  rejected((c) => {
    must(c.records[1]).data.id = must(c.records[0]).data.id;
  }, /conflicting/);
  rejected((c) => {
    must(c.records[2]).data['pull_request'] = {};
  }, /pull request/);
  rejected((c) => {
    must(c.records[2]).sourceId = 'github-delivery';
  }, /another repository/);
  rejected((c) => {
    must(c.sources[0]).coverage.relations = 'complete';
  }, /missing or malformed/);
  rejected((c) => {
    Reflect.set(must(must(c.records[0]).data.relations), 'blocks', ['OBS-9']);
  }, /not an issue reference/);
  rejected((c) => {
    must(must(must(must(c.records[2]).links).blockedBy)[0])['html_url'] =
      'https://github.com/example/elsewhere/issues/7';
  }, /undeclared/);
  rejected((c) => {
    must(c.records[0]).data.url = 'https://user:secret@example.com';
  }, /without credentials/);
  rejected((c) => {
    must(c.sources[0]).provider = 'jira';
  }, /No native normalizer/);
});
void test('source invariants fail before native records are interpreted, including empty captures', () => {
  for (const [modify, code, path] of [
    [
      (c: TestCapture) =>
        c.sources.push({
          ...must(c.sources[1]),
          id: must(c.sources[0]).id,
          namespace: 'github.com/example/another',
        }),
      'duplicate-id',
      '/sources/3/id',
    ],
    [
      (c: TestCapture) => {
        must(c.sources[2]).namespace = must(c.sources[1]).namespace;
      },
      'duplicate-source',
      '/sources/2/namespace',
    ],
    [
      (c: TestCapture) => {
        must(c.sources[1]).namespace = 'GitHub.com/Example/Control';
      },
      'source-namespace',
      '/sources/1/namespace',
    ],
  ] as const) {
    for (const recordState of ['valid', 'invalid', 'empty']) {
      const capture = mixedCapture();
      modify(capture);
      if (recordState === 'invalid') must(capture.records[0]).data = {};
      if (recordState === 'empty') capture.records = [];
      const before = structuredClone(capture);
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          assert.ok(
            getDiagnostics(error).some(
              (d) => d.code === code && d.path === path && d.fix,
            ),
          );
          assert.ok(
            getDiagnostics(error).every((d) => d.path.startsWith('/sources/')),
          );
          return true;
        },
      );
      assert.deepEqual(capture, before);
    }
  }
});
void test('GitHub metadata arrays and elements have actionable diagnostics while valid native forms are preserved', () => {
  for (const field of ['assignees', 'labels']) {
    const invalidElements: unknown[] = [
      null,
      42,
      false,
      [],
      {},
      { login: null, name: null },
      { login: ' ', name: ' ' },
    ];
    invalidElements.push(field === 'assignees' ? 'private-probe-text' : ' ');
    for (const [value, suffix] of [
      ...['private-probe-text', null, 42, {}].map(
        (value) => [value, ''] as const,
      ),
      ...invalidElements.map((value) => [[value], '/0'] as const),
    ] as const) {
      const capture = mixedCapture();
      must(capture.records[2]).data[field] = value;
      const before = structuredClone(capture);
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          const [diagnostic] = getDiagnostics(error);
          assert.equal(must(diagnostic).code, 'capture');
          assert.equal(
            must(diagnostic).path,
            `/records/2/data/${field}${suffix}`,
          );
          assert.ok(must(diagnostic).fix);
          assert.ok(
            !JSON.stringify(getDiagnostics(error)).includes(
              'private-probe-text',
            ),
          );
          return true;
        },
      );
      assert.deepEqual(capture, before);
    }
  }
  const capture = mixedCapture(),
    raw = must(capture.records[2]).data;
  delete raw['assignees'];
  delete raw['labels'];
  let issue = normalizeCapture(capture).issues[2];
  assert.equal(must(issue).assignee, null);
  assert.equal(Object.hasOwn(must(issue), 'labels'), false);
  raw['assignees'] = [];
  raw['labels'] = [];
  issue = normalizeCapture(capture).issues[2];
  assert.equal(must(issue).assignee, null);
  assert.deepEqual(must(issue).labels, []);
  raw['assignees'] = [{ login: 'invented-ada' }, { login: 'invented-ren' }];
  raw['labels'] = ['Invented tooling', { name: 'Invented research' }];
  issue = normalizeCapture(capture).issues[2];
  assert.equal(must(issue).assignee, 'invented-ada, invented-ren');
  assert.deepEqual(must(issue).labels, [
    'Invented tooling',
    'Invented research',
  ]);
});
void test('missing, malformed or non-HTTP GitHub URLs identify the field before repository resolution', () => {
  for (const endpoint of [false, true]) {
    for (const value of [
      undefined,
      null,
      '',
      ' ',
      7,
      {},
      'private-probe-text',
      'javascript:private-probe-text',
      'data:text/plain,private-probe-text',
      'ftp://github.com/example/control/issues/7',
      'ftp://github.com/example/delivery/issues/7',
    ]) {
      const capture = mixedCapture();
      const raw = endpoint
        ? must(must(must(capture.records[2]).links).blockedBy)[0]
        : must(capture.records[2]).data;
      if (value === undefined) delete must(raw)['html_url'];
      else Reflect.set(must(raw), 'html_url', value);
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          const [diagnostic] = getDiagnostics(error);
          assert.equal(must(diagnostic).code, 'capture');
          assert.equal(
            must(diagnostic).path,
            `/records/2/${endpoint ? 'links/blockedBy/0' : 'data'}/html_url`,
          );
          assert.match(
            must(diagnostic).message,
            /html_url is missing or malformed/,
          );
          assert.match(must(diagnostic).fix, /HTTP\(S\)/);
          assert.ok(
            !JSON.stringify(getDiagnostics(error)).includes(
              'private-probe-text',
            ),
          );
          return true;
        },
      );
    }
  }
  for (const protocol of ['http:', 'https:']) {
    const capture = mixedCapture();
    for (const raw of [
      must(capture.records[2]).data,
      must(must(must(capture.records[2]).links).blockedBy)[0],
    ])
      must(raw)['html_url'] = must(must(raw)['html_url']).replace(
        'https:',
        protocol,
      );
    const map = normalizeCapture(capture);
    assert.equal(
      must(map.issues[2]).url,
      must(capture.records[2]).data.html_url,
    );
    assert.equal(map.relations.length, 3);
  }
});
void test('status mapping preserves native duplicate closure and keeps unknown reasons unknown', () => {
  const capture = mixedCapture();
  must(capture.records[0]).data['statusType'] = 'triage';
  assert.deepEqual(must(normalizeCapture(capture).issues[0]).status, {
    type: 'unknown',
    label: 'Investigating',
  });
  for (const reason of [null, 'new-future-reason']) {
    must(capture.records[4]).data['state_reason'] = reason;
    const status = must(normalizeCapture(capture).issues[4]).status;
    assert.equal(status.type, 'unknown');
    assert.equal(status.label, reason ? 'closed · ' + reason : 'closed');
  }
  for (const [reason, type] of [
    ['completed', 'completed'],
    ['not_planned', 'canceled'],
    ['duplicate', 'duplicate'],
  ] as const) {
    must(capture.records[4]).data['state_reason'] = reason;
    assert.deepEqual(must(normalizeCapture(capture).issues[4]).status, {
      type,
      label: 'closed · ' + reason,
    });
    must(capture.records[4]).data['state'] = 'open';
    assert.equal(
      must(normalizeCapture(capture).issues[4]).status.type,
      'unstarted',
    );
    must(capture.records[4]).data['state'] = 'closed';
  }
});

void test('explicit native IDs cannot reuse another issue identifier, including unfetched endpoints', () => {
  for (const reverse of [false, true]) {
    rejected((c) => {
      must(must(must(must(c.records[2]).links).blockedBy)[0])['node_id'] =
        'I_distinct_unfetched_issue';
      if (reverse) c.records.reverse();
    }, /conflicting/);
    rejected((c) => {
      must(must(must(must(c.records[0]).data.relations).blocks)[0]).uuid =
        'distinct-unfetched-uuid';
      if (reverse) c.records.reverse();
    }, /conflicting/);
    rejected((c) => {
      must(must(c.records[0]).data.relations).relatedTo = [
        { id: 'EXT-1', uuid: 'external-uuid-1' },
        { id: 'EXT-1', uuid: 'external-uuid-2' },
      ];
      if (reverse)
        must(must(must(c.records[0]).data.relations).relatedTo).reverse();
    }, /conflicting/);
  }
});

void test('unfetched Linear UUID and identifier observations form one context regardless of order', () => {
  const capture = mixedCapture();
  capture.sources = capture.sources.slice(0, 1);
  capture.records = capture.records.slice(0, 2);
  for (const record of capture.records) {
    record.data.relations = {
      blocks: [],
      blockedBy: [],
      relatedTo: [],
      duplicateOf: null,
    };
    delete record.data.parentId;
  }
  must(must(capture.records[0]).data.relations).relatedTo = [{ id: 'EXT-1' }];
  must(capture.records[0]).links = {
    children: [
      { id: 'EXT-1', uuid: 'external-uuid-1', title: 'External child' },
    ],
  };
  must(capture.records[1]).data.parentId = 'external-uuid-1';
  const before = structuredClone(capture);
  const semantic = (map: StellarWorkMap) => ({
    issues: map.issues.toSorted((a: { id: string }, b) =>
      a.id.localeCompare(b.id),
    ),
    relations: map.relations.toSorted((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    ),
  });
  const forward = normalizeCapture(capture);
  assert.deepEqual(capture, before);
  capture.records.reverse();
  assert.deepEqual(semantic(normalizeCapture(capture)), semantic(forward));
  const context = forward.issues.filter((i) => i.scope === 'context');
  assert.equal(context.length, 1);
  const [external] = context;
  assert.equal(must(external).nativeId, 'external-uuid-1');
  assert.equal(must(external).identifier, 'EXT-1');
  assert.equal(must(external).title, 'External child');
  assert.equal(must(external).detail, 'unqueried');
  assert.equal(must(external).status.type, 'unknown');
  const [parent, child] = forward.issues;
  assert.deepEqual(
    forward.relations.filter((e) => e.kind === 'parent'),
    [
      { kind: 'parent', source: must(parent).id, target: must(external).id },
      { kind: 'parent', source: must(external).id, target: must(child).id },
    ],
  );
  assert.equal(forward.relations.length, 3);

  // Alias-only and UUID-bearing observations in the same lookup also deduplicate.
  const related = must(must(capture.records[1]).data.relations).relatedTo;
  must(related).push({ id: 'EXT-1', uuid: 'external-uuid-1' });
  for (let order = 0; order < 2; order++) {
    must(related).reverse();
    assert.deepEqual(semantic(normalizeCapture(capture)), semantic(forward));
  }
});

void test('an observed Linear UUID also resolves full detail captured only by identifier', () => {
  const capture = mixedCapture();
  delete must(capture.records[1]).data.uuid;
  must(capture.records[0]).links = {
    children: [{ id: 'OBS-2', uuid: 'invented-linear-uuid-2' }],
  };
  for (const records of [capture.records, capture.records.toReversed()]) {
    const map = normalizeCapture({ ...capture, records });
    const child = map.issues.find((i) => i.identifier === 'OBS-2');
    assert.equal(must(child).nativeId, 'invented-linear-uuid-2');
    assert.equal(must(child).detail, 'full');
    assert.equal(map.issues.length, 5);
    assert.equal(map.relations.length, 3);
  }
});

void test('ambiguous native references and noncanonical repository namespaces are rejected', () => {
  rejected((c) => {
    must(must(c.records[0]).data.relations).blocks = [
      { id: 'OBS-1', uuid: must(c.records[1]).data.uuid },
    ];
  }, /disagree/);
  rejected((c) => {
    must(c.sources[1]).namespace = 'GitHub.com/Example/Control';
  }, /lowercase/);
  rejected((c) => {
    must(must(must(must(c.records[2]).links).blockedBy)[0])['number'] = 0;
  }, /not an issue/);
});
void test('source contract rejects missing sources, repeated native identities and duplicate namespaces', () => {
  for (const [mutate, code] of [
    [
      (d: WorkMap) => {
        must(d.issues[0]).sourceId = 'absent';
      },
      'unknown-source',
    ],
    [
      (d: WorkMap) => {
        must(d.issues[1]).nativeId = must(d.issues[0]).nativeId;
      },
      'duplicate-native-id',
    ],
    [
      (d: WorkMap) => {
        must(d.sources[2]).namespace = must(d.sources[1]).namespace;
      },
      'duplicate-source',
    ],
  ] as const) {
    const map = mixedMap();
    mutate(map);
    assert.ok(validateWorkMap(map).diagnostics.some((d) => d.code === code));
  }
});
void test('normalization diagnostics identify captured fields and parent observations before a draft exists', () => {
  for (const [modify, code, path] of [
    [
      (c: TestCapture) => {
        must(c.records[0]).data.url = 'javascript:private-probe-text';
      },
      'schema',
      '/records/0/data/url',
    ],
    [
      (c: TestCapture) => {
        must(c.records[2]).data['updated_at'] = 'tomorrow';
      },
      'schema',
      '/records/2/data/updated_at',
    ],
    [
      (c: TestCapture) => {
        must(must(c.records[0]).data.relations).relatedTo = [{ id: 'EXT-99' }];
        must(c.records[1]).links = {
          children: [
            {
              id: 'EXT-99',
              uuid: 'external-99',
              url: 'javascript:private-probe-text',
            },
          ],
        };
      },
      'schema',
      '/records/1/links/children/0/url',
    ],
    [
      (c: TestCapture) => {
        must(must(must(c.records[2]).links).blockedBy)[0] = {
          node_id: 'I_external_99',
          number: 99,
          html_url:
            'https://user:private-probe-text@github.com/example/delivery/issues/99',
        };
      },
      'unsafe-url',
      '/records/2/links/blockedBy/0/html_url',
    ],
    [
      (c: TestCapture) => {
        must(c.records[0]).links = { children: [{ id: 'EXT-99' }] };
        must(c.records[1]).links = { children: [{ id: 'EXT-99' }] };
      },
      'multiple-parents',
      '/records/1/links/children/0',
    ],
    [
      (c: TestCapture) => {
        must(c.records[0]).data.parentId = must(c.records[1]).data.uuid;
        must(must(c.records[0]).data.relations).relatedTo = [{ id: 'EXT-99' }];
      },
      'parent-cycle',
      '/records/0/data/parentId',
    ],
    [
      (c: TestCapture) => {
        must(c.sources[1]).namespace = 'GitHub.com/Example/Control';
      },
      'source-namespace',
      '/sources/1/namespace',
    ],
  ] as const) {
    const capture = mixedCapture();
    modify(capture);
    const before = structuredClone(capture);
    assert.throws(
      () => normalizeCapture(capture),
      (error) => {
        assert.ok(
          getDiagnostics(error).some((d) => d.code === code && d.path === path),
          JSON.stringify(getDiagnostics(error)),
        );
        assert.ok(
          !JSON.stringify(getDiagnostics(error)).includes('private-probe-text'),
        );
        assert.notEqual(
          must(path)
            .slice(1)
            .split('/')
            .reduce<unknown>((at, part) => property(at, part), capture),
          undefined,
        );
        return true;
      },
    );
    assert.deepEqual(capture, before);
  }
});
void test('normalize CLI writes a private draft, protects captures and preserves earlier output on failure', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-normalize-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = join(dir, 'capture.json'),
    output = join(dir, 'draft.json');
  const cli = fileURLToPath(new URL('../bin/stellar.ts', import.meta.url));
  const run = (out = output) =>
    spawnSync(process.execPath, [cli, 'normalize', input, out], {
      cwd: dir,
      encoding: 'utf8',
    });
  await writeFile(input, JSON.stringify(mixedCapture()));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(objectJSON(result.stdout)['needsClassification'], 4);
  const before = await readFile(output, 'utf8');
  assert.deepEqual(JSON.parse(before), normalizeCapture(mixedCapture()));
  assert.equal(run(input).status, 1);
  const alias = join(dir, 'alias.json');
  await symlink(input, alias);
  assert.equal(run(alias).status, 1);
  const conflict = mixedCapture();
  must(must(must(must(conflict.records[2]).links).blockedBy)[0])['node_id'] =
    'I_distinct_unfetched_issue';
  await writeFile(input, JSON.stringify(conflict));
  assert.equal(run().status, 1);
  assert.equal(await readFile(output, 'utf8'), before);
  const invalid = mixedCapture();
  must(must(invalid.records[0]).data.relations).relatedTo = [
    { id: 'EXT-99', url: 'javascript:private-probe-text' },
  ];
  await writeFile(input, JSON.stringify(invalid));
  const unwritten = join(dir, 'unwritten.json'),
    failure = run(unwritten);
  assert.equal(failure.status, 1);
  assert.equal(
    must(readFailure(failure.stderr).diagnostics[0]).path,
    '/records/0/data/relations/relatedTo/0/url',
  );
  assert.ok(!failure.stderr.includes('private-probe-text'));
  await assert.rejects(readFile(unwritten), { code: 'ENOENT' });
  assert.equal(run().status, 1);
  assert.equal(await readFile(output, 'utf8'), before);
  for (const [modify, path] of [
    [
      (c: TestCapture) =>
        c.sources.push({
          ...must(c.sources[1]),
          id: must(c.sources[0]).id,
          namespace: 'github.com/example/another',
        }),
      '/sources/3/id',
    ],
    [
      (c: TestCapture) => {
        must(c.sources[2]).namespace = must(c.sources[1]).namespace;
      },
      '/sources/2/namespace',
    ],
    [
      (c: TestCapture) => {
        must(c.records[2]).data['assignees'] = 'private-probe-text';
      },
      '/records/2/data/assignees',
    ],
    [
      (c: TestCapture) => {
        must(c.records[2]).data['labels'] = [null];
      },
      '/records/2/data/labels/0',
    ],
    [
      (c: TestCapture) => {
        delete must(c.records[2]).data.html_url;
      },
      '/records/2/data/html_url',
    ],
    [
      (c: TestCapture) => {
        delete must(must(must(must(c.records[2]).links).blockedBy)[0])[
          'html_url'
        ];
      },
      '/records/2/links/blockedBy/0/html_url',
    ],
    [
      (c: TestCapture) => {
        must(c.records[2]).data.html_url = 'javascript:private-probe-text';
      },
      '/records/2/data/html_url',
    ],
    [
      (c: TestCapture) => {
        must(must(must(must(c.records[2]).links).blockedBy)[0])['html_url'] =
          'javascript:private-probe-text';
      },
      '/records/2/links/blockedBy/0/html_url',
    ],
  ] as const) {
    const capture = mixedCapture();
    modify(capture);
    await writeFile(input, JSON.stringify(capture));
    for (const target of [output, unwritten]) {
      const failure = run(target);
      assert.equal(failure.status, 1);
      const diagnostics = readFailure(failure.stderr).diagnostics;
      assert.ok(diagnostics.some((d) => d.path === path && d.fix));
      assert.ok(!failure.stderr.includes('private-probe-text'));
    }
    assert.equal(await readFile(output, 'utf8'), before);
    await assert.rejects(readFile(unwritten), { code: 'ENOENT' });
  }
  await writeFile(input, '{"private-sensitive-title":');
  assert.equal(run().status, 1);
  assert.ok(!run().stderr.includes('private-sensitive-title'));
  assert.equal(await readFile(output, 'utf8'), before);
});

void test('open native metadata preserves existing status coercion and nullable optional values', () => {
  for (const [reason, label] of [
    [{}, 'closed · [object Object]'],
    [['one', 'two'], 'closed · one,two'],
    [true, 'closed · true'],
    [4, 'closed · 4'],
    [null, 'closed'],
    ['', 'closed'],
  ] as const) {
    const capture = mixedCapture();
    const raw = must(capture.records[2]).data;
    raw['state'] = 'closed';
    raw['state_reason'] = reason;
    raw.body = null;
    const map = normalizeCapture(capture);
    const issue = map.issues.find((item) => item.nativeId === raw.node_id);
    assert.deepEqual(must(issue).status, { label, type: 'unknown' });
    assert.equal(must(issue).description, null);
    assert.equal(Object.hasOwn(must(issue), 'completedAt'), false);
  }
});
