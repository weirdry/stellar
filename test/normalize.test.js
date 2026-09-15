import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { normalizeCapture } from '../lib/normalize.js';
import { validateWorkMap } from '../lib/validate.js';
import { mixedCapture, mixedMap } from './fixtures.js';

const rejected = (mutate, pattern) => {
  const capture = mixedCapture();
  mutate(capture);
  assert.throws(
    () => normalizeCapture(capture),
    (error) => error.diagnostics?.some((d) => pattern.test(d.message) && d.fix),
  );
};
test('the purpose exercise capture normalizes to its documented scope without fixing a taxonomy', async () => {
  const capture = JSON.parse(
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
  assert.equal(context[0].detail, 'unqueried');
  assert.equal(context[0].status.type, 'unknown');
  assert.equal(map.relations.length, 3);
  const result = validateWorkMap(map);
  assert.equal(result.valid, false);
  assert.equal(result.diagnostics.length, 7);
  assert.ok(
    result.diagnostics.every((d) => d.code === 'missing-classification'),
  );
});
test('mixed native records preserve facts, resolve Linear aliases and distinguish repository-local issue numbers', () => {
  const capture = mixedCapture(),
    before = structuredClone(capture);
  const map = normalizeCapture(capture);
  assert.deepEqual(capture, before);
  assert.deepEqual(map, normalizeCapture(capture));
  assert.equal(map.issues.length, 5);
  const [linear, child, control, delivery, closed] = map.issues;
  assert.equal(linear.nativeId, capture.records[0].data.uuid);
  assert.equal(linear.title, capture.records[0].data.title);
  assert.equal(linear.description, capture.records[0].data.description);
  assert.deepEqual(linear.status, { type: 'started', label: 'Investigating' });
  assert.equal(control.identifier, delivery.identifier);
  assert.notEqual(control.id, delivery.id);
  assert.equal(control.status.type, 'unstarted');
  assert.equal(closed.status.type, 'canceled');
  assert.equal(
    map.relations.length,
    3,
    'outgoing/incoming observations of one blocker deduplicate',
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' && e.source === linear.id && e.target === child.id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'parent' && e.source === linear.id && e.target === child.id,
    ),
  );
  assert.ok(
    map.relations.some(
      (e) =>
        e.kind === 'blocks' &&
        e.source === delivery.id &&
        e.target === control.id,
    ),
  );
  assert.ok(
    validateWorkMap(map).diagnostics.every(
      (d) => d.code === 'missing-classification',
    ),
  );
  assert.equal(validateWorkMap(mixedMap()).valid, true);
});
test('unfetched relation endpoints stay context with unknown status, without inventing inferred edges', () => {
  const capture = mixedCapture();
  capture.records[0].data.relations.relatedTo = [
    { id: 'OBS-99', title: 'Unfetched spectral study' },
  ];
  capture.records[0].data.relations.duplicateOf = { id: 'OBS-100' };
  capture.records[1].data.description =
    'Same words and URL mention as another issue.';
  const map = normalizeCapture(capture),
    unknown = map.issues.find((i) => i.identifier === 'OBS-99');
  assert.equal(unknown.scope, 'context');
  assert.equal(unknown.detail, 'unqueried');
  assert.equal(unknown.status.type, 'unknown');
  assert.equal(map.relations.length, 5);
  assert.ok(
    map.relations.some(
      (e) => e.kind === 'duplicate' && e.source === map.issues[0].id,
    ),
  );
});
test('normalization rejects contradictory identity, malformed references and false complete coverage', () => {
  rejected((c) => c.records.push(c.records[0]), /more than once/);
  rejected((c) => {
    c.records[1].data.id = c.records[0].data.id;
  }, /conflicting/);
  rejected((c) => {
    c.records[2].data.pull_request = {};
  }, /pull request/);
  rejected((c) => {
    c.records[2].sourceId = 'github-delivery';
  }, /another repository/);
  rejected((c) => {
    c.sources[0].coverage.relations = 'complete';
  }, /missing or malformed/);
  rejected((c) => {
    c.records[0].data.relations.blocks = ['OBS-9'];
  }, /not an issue reference/);
  rejected((c) => {
    c.records[2].links.blockedBy[0].html_url =
      'https://github.com/example/elsewhere/issues/7';
  }, /undeclared/);
  rejected((c) => {
    c.records[0].data.url = 'https://user:secret@example.com';
  }, /without credentials/);
  rejected((c) => {
    c.sources[0].provider = 'jira';
  }, /No native normalizer/);
});
test('source invariants fail before native records are interpreted, including empty captures', () => {
  for (const [modify, code, path] of [
    [
      (c) =>
        c.sources.push({
          ...c.sources[1],
          id: c.sources[0].id,
          namespace: 'github.com/example/another',
        }),
      'duplicate-id',
      '/sources/3/id',
    ],
    [
      (c) => {
        c.sources[2].namespace = c.sources[1].namespace;
      },
      'duplicate-source',
      '/sources/2/namespace',
    ],
    [
      (c) => {
        c.sources[1].namespace = 'GitHub.com/Example/Control';
      },
      'source-namespace',
      '/sources/1/namespace',
    ],
  ]) {
    for (const recordState of ['valid', 'invalid', 'empty']) {
      const capture = mixedCapture();
      modify(capture);
      if (recordState === 'invalid') capture.records[0].data = {};
      if (recordState === 'empty') capture.records = [];
      const before = structuredClone(capture);
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          assert.ok(
            error.diagnostics.some(
              (d) => d.code === code && d.path === path && d.fix,
            ),
          );
          assert.ok(
            error.diagnostics.every((d) => d.path.startsWith('/sources/')),
          );
          return true;
        },
      );
      assert.deepEqual(capture, before);
    }
  }
});
test('GitHub metadata arrays and elements have actionable diagnostics while valid native forms are preserved', () => {
  for (const field of ['assignees', 'labels']) {
    const invalidElements = [
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
      ...['private-probe-text', null, 42, {}].map((value) => [value, '']),
      ...invalidElements.map((value) => [[value], '/0']),
    ]) {
      const capture = mixedCapture();
      capture.records[2].data[field] = value;
      const before = structuredClone(capture);
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          const [diagnostic] = error.diagnostics;
          assert.equal(diagnostic.code, 'capture');
          assert.equal(diagnostic.path, `/records/2/data/${field}${suffix}`);
          assert.ok(diagnostic.fix);
          assert.ok(
            !JSON.stringify(error.diagnostics).includes('private-probe-text'),
          );
          return true;
        },
      );
      assert.deepEqual(capture, before);
    }
  }
  const capture = mixedCapture(),
    raw = capture.records[2].data;
  delete raw.assignees;
  delete raw.labels;
  let issue = normalizeCapture(capture).issues[2];
  assert.equal(issue.assignee, null);
  assert.equal(Object.hasOwn(issue, 'labels'), false);
  raw.assignees = [];
  raw.labels = [];
  issue = normalizeCapture(capture).issues[2];
  assert.equal(issue.assignee, null);
  assert.deepEqual(issue.labels, []);
  raw.assignees = [{ login: 'invented-ada' }, { login: 'invented-ren' }];
  raw.labels = ['Invented tooling', { name: 'Invented research' }];
  issue = normalizeCapture(capture).issues[2];
  assert.equal(issue.assignee, 'invented-ada, invented-ren');
  assert.deepEqual(issue.labels, ['Invented tooling', 'Invented research']);
});
test('missing, malformed or non-HTTP GitHub URLs identify the field before repository resolution', () => {
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
        ? capture.records[2].links.blockedBy[0]
        : capture.records[2].data;
      if (value === undefined) delete raw.html_url;
      else raw.html_url = value;
      assert.throws(
        () => normalizeCapture(capture),
        (error) => {
          const [diagnostic] = error.diagnostics;
          assert.equal(diagnostic.code, 'capture');
          assert.equal(
            diagnostic.path,
            `/records/2/${endpoint ? 'links/blockedBy/0' : 'data'}/html_url`,
          );
          assert.match(diagnostic.message, /html_url is missing or malformed/);
          assert.match(diagnostic.fix, /HTTP\(S\)/);
          assert.ok(
            !JSON.stringify(error.diagnostics).includes('private-probe-text'),
          );
          return true;
        },
      );
    }
  }
  for (const protocol of ['http:', 'https:']) {
    const capture = mixedCapture();
    for (const raw of [
      capture.records[2].data,
      capture.records[2].links.blockedBy[0],
    ])
      raw.html_url = raw.html_url.replace('https:', protocol);
    const map = normalizeCapture(capture);
    assert.equal(map.issues[2].url, capture.records[2].data.html_url);
    assert.equal(map.relations.length, 3);
  }
});
test('status mapping preserves native duplicate closure and keeps unknown reasons unknown', () => {
  const capture = mixedCapture();
  capture.records[0].data.statusType = 'triage';
  assert.deepEqual(normalizeCapture(capture).issues[0].status, {
    type: 'unknown',
    label: 'Investigating',
  });
  for (const reason of [null, 'new-future-reason']) {
    capture.records[4].data.state_reason = reason;
    const status = normalizeCapture(capture).issues[4].status;
    assert.equal(status.type, 'unknown');
    assert.equal(status.label, reason ? 'closed · ' + reason : 'closed');
  }
  for (const [reason, type] of [
    ['completed', 'completed'],
    ['not_planned', 'canceled'],
    ['duplicate', 'duplicate'],
  ]) {
    capture.records[4].data.state_reason = reason;
    assert.deepEqual(normalizeCapture(capture).issues[4].status, {
      type,
      label: 'closed · ' + reason,
    });
    capture.records[4].data.state = 'open';
    assert.equal(normalizeCapture(capture).issues[4].status.type, 'unstarted');
    capture.records[4].data.state = 'closed';
  }
});

test('explicit native IDs cannot reuse another issue identifier, including unfetched endpoints', () => {
  for (const reverse of [false, true]) {
    rejected((c) => {
      c.records[2].links.blockedBy[0].node_id = 'I_distinct_unfetched_issue';
      if (reverse) c.records.reverse();
    }, /conflicting/);
    rejected((c) => {
      c.records[0].data.relations.blocks[0].uuid = 'distinct-unfetched-uuid';
      if (reverse) c.records.reverse();
    }, /conflicting/);
    rejected((c) => {
      c.records[0].data.relations.relatedTo = [
        { id: 'EXT-1', uuid: 'external-uuid-1' },
        { id: 'EXT-1', uuid: 'external-uuid-2' },
      ];
      if (reverse) c.records[0].data.relations.relatedTo.reverse();
    }, /conflicting/);
  }
});

test('unfetched Linear UUID and identifier observations form one context regardless of order', () => {
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
  capture.records[0].data.relations.relatedTo = [{ id: 'EXT-1' }];
  capture.records[0].links = {
    children: [
      { id: 'EXT-1', uuid: 'external-uuid-1', title: 'External child' },
    ],
  };
  capture.records[1].data.parentId = 'external-uuid-1';
  const before = structuredClone(capture);
  const semantic = (map) => ({
    issues: map.issues.toSorted((a, b) => a.id.localeCompare(b.id)),
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
  assert.equal(external.nativeId, 'external-uuid-1');
  assert.equal(external.identifier, 'EXT-1');
  assert.equal(external.title, 'External child');
  assert.equal(external.detail, 'unqueried');
  assert.equal(external.status.type, 'unknown');
  const [parent, child] = forward.issues;
  assert.deepEqual(
    forward.relations.filter((e) => e.kind === 'parent'),
    [
      { kind: 'parent', source: parent.id, target: external.id },
      { kind: 'parent', source: external.id, target: child.id },
    ],
  );
  assert.equal(forward.relations.length, 3);

  // Alias-only and UUID-bearing observations in the same lookup also deduplicate.
  const related = capture.records[1].data.relations.relatedTo;
  related.push({ id: 'EXT-1', uuid: 'external-uuid-1' });
  for (let order = 0; order < 2; order++) {
    related.reverse();
    assert.deepEqual(semantic(normalizeCapture(capture)), semantic(forward));
  }
});

test('an observed Linear UUID also resolves full detail captured only by identifier', () => {
  const capture = mixedCapture();
  delete capture.records[1].data.uuid;
  capture.records[0].links = {
    children: [{ id: 'OBS-2', uuid: 'invented-linear-uuid-2' }],
  };
  for (const records of [capture.records, capture.records.toReversed()]) {
    const map = normalizeCapture({ ...capture, records });
    const child = map.issues.find((i) => i.identifier === 'OBS-2');
    assert.equal(child.nativeId, 'invented-linear-uuid-2');
    assert.equal(child.detail, 'full');
    assert.equal(map.issues.length, 5);
    assert.equal(map.relations.length, 3);
  }
});

test('ambiguous native references and noncanonical repository namespaces are rejected', () => {
  rejected((c) => {
    c.records[0].data.relations.blocks = [
      { id: 'OBS-1', uuid: c.records[1].data.uuid },
    ];
  }, /disagree/);
  rejected((c) => {
    c.sources[1].namespace = 'GitHub.com/Example/Control';
  }, /lowercase/);
  rejected((c) => {
    c.records[2].links.blockedBy[0].number = 0;
  }, /not an issue/);
});
test('source contract rejects missing sources, repeated native identities and duplicate namespaces', () => {
  for (const [mutate, code] of [
    [
      (d) => {
        d.issues[0].sourceId = 'absent';
      },
      'unknown-source',
    ],
    [
      (d) => {
        d.issues[1].nativeId = d.issues[0].nativeId;
      },
      'duplicate-native-id',
    ],
    [
      (d) => {
        d.sources[2].namespace = d.sources[1].namespace;
      },
      'duplicate-source',
    ],
  ]) {
    const map = mixedMap();
    mutate(map);
    assert.ok(validateWorkMap(map).diagnostics.some((d) => d.code === code));
  }
});
test('normalization diagnostics identify captured fields and parent observations before a draft exists', () => {
  for (const [modify, code, path] of [
    [
      (c) => {
        c.records[0].data.url = 'javascript:private-probe-text';
      },
      'schema',
      '/records/0/data/url',
    ],
    [
      (c) => {
        c.records[2].data.updated_at = 'tomorrow';
      },
      'schema',
      '/records/2/data/updated_at',
    ],
    [
      (c) => {
        c.records[0].data.relations.relatedTo = [{ id: 'EXT-99' }];
        c.records[1].links = {
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
      (c) => {
        c.records[2].links.blockedBy[0] = {
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
      (c) => {
        c.records[0].links = { children: [{ id: 'EXT-99' }] };
        c.records[1].links = { children: [{ id: 'EXT-99' }] };
      },
      'multiple-parents',
      '/records/1/links/children/0',
    ],
    [
      (c) => {
        c.records[0].data.parentId = c.records[1].data.uuid;
        c.records[0].data.relations.relatedTo = [{ id: 'EXT-99' }];
      },
      'parent-cycle',
      '/records/0/data/parentId',
    ],
    [
      (c) => {
        c.sources[1].namespace = 'GitHub.com/Example/Control';
      },
      'source-namespace',
      '/sources/1/namespace',
    ],
  ]) {
    const capture = mixedCapture();
    modify(capture);
    const before = structuredClone(capture);
    assert.throws(
      () => normalizeCapture(capture),
      (error) => {
        assert.ok(
          error.diagnostics.some((d) => d.code === code && d.path === path),
          JSON.stringify(error.diagnostics),
        );
        assert.ok(
          !JSON.stringify(error.diagnostics).includes('private-probe-text'),
        );
        assert.notEqual(
          path
            .slice(1)
            .split('/')
            .reduce((at, part) => at?.[part], capture),
          undefined,
        );
        return true;
      },
    );
    assert.deepEqual(capture, before);
  }
});
test('normalize CLI writes a private draft, protects captures and preserves earlier output on failure', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-normalize-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = join(dir, 'capture.json'),
    output = join(dir, 'draft.json');
  const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
  const run = (out = output) =>
    spawnSync(process.execPath, [cli, 'normalize', input, out], {
      cwd: dir,
      encoding: 'utf8',
    });
  await writeFile(input, JSON.stringify(mixedCapture()));
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).needsClassification, 4);
  const before = await readFile(output, 'utf8');
  assert.deepEqual(JSON.parse(before), normalizeCapture(mixedCapture()));
  assert.equal(run(input).status, 1);
  const alias = join(dir, 'alias.json');
  await symlink(input, alias);
  assert.equal(run(alias).status, 1);
  const conflict = mixedCapture();
  conflict.records[2].links.blockedBy[0].node_id = 'I_distinct_unfetched_issue';
  await writeFile(input, JSON.stringify(conflict));
  assert.equal(run().status, 1);
  assert.equal(await readFile(output, 'utf8'), before);
  const invalid = mixedCapture();
  invalid.records[0].data.relations.relatedTo = [
    { id: 'EXT-99', url: 'javascript:private-probe-text' },
  ];
  await writeFile(input, JSON.stringify(invalid));
  const unwritten = join(dir, 'unwritten.json'),
    failure = run(unwritten);
  assert.equal(failure.status, 1);
  assert.equal(
    JSON.parse(failure.stderr).diagnostics[0].path,
    '/records/0/data/relations/relatedTo/0/url',
  );
  assert.ok(!failure.stderr.includes('private-probe-text'));
  await assert.rejects(readFile(unwritten), { code: 'ENOENT' });
  assert.equal(run().status, 1);
  assert.equal(await readFile(output, 'utf8'), before);
  for (const [modify, path] of [
    [
      (c) =>
        c.sources.push({
          ...c.sources[1],
          id: c.sources[0].id,
          namespace: 'github.com/example/another',
        }),
      '/sources/3/id',
    ],
    [
      (c) => {
        c.sources[2].namespace = c.sources[1].namespace;
      },
      '/sources/2/namespace',
    ],
    [
      (c) => {
        c.records[2].data.assignees = 'private-probe-text';
      },
      '/records/2/data/assignees',
    ],
    [
      (c) => {
        c.records[2].data.labels = [null];
      },
      '/records/2/data/labels/0',
    ],
    [
      (c) => {
        delete c.records[2].data.html_url;
      },
      '/records/2/data/html_url',
    ],
    [
      (c) => {
        delete c.records[2].links.blockedBy[0].html_url;
      },
      '/records/2/links/blockedBy/0/html_url',
    ],
    [
      (c) => {
        c.records[2].data.html_url = 'javascript:private-probe-text';
      },
      '/records/2/data/html_url',
    ],
    [
      (c) => {
        c.records[2].links.blockedBy[0].html_url =
          'javascript:private-probe-text';
      },
      '/records/2/links/blockedBy/0/html_url',
    ],
  ]) {
    const capture = mixedCapture();
    modify(capture);
    await writeFile(input, JSON.stringify(capture));
    for (const target of [output, unwritten]) {
      const failure = run(target);
      assert.equal(failure.status, 1);
      const diagnostics = JSON.parse(failure.stderr).diagnostics;
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
