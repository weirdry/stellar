// Synthetic differential inputs supplement the canonical normalization suite.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2];
mkdirSync(out);
const original = JSON.parse(
  readFileSync(
    new URL('./baseline/examples/mixed-capture.json', import.meta.url),
  ),
);
const cases = [];
function add(name, modify, native = true) {
  const value = structuredClone(original);
  modify(value);
  writeFileSync(join(out, name + '.json'), JSON.stringify(value));
  cases.push({ name, native });
}
add('mixed', () => {});
add('ko', (c) => {
  c.locale = 'ko';
  c.records[0].data.relations.relatedTo = [{ id: '외부-😀', title: '😀 가상' }];
});
add('empty', (c) => {
  c.records = [];
});
add('context', (c) =>
  c.records.forEach((r) => {
    r.scope = 'context';
  }),
);
add('collisions', (c) => {
  c.records[0].data.uuid = c.records[2].data.node_id = 'same|["가상"]';
  c.records.forEach((r) => {
    r.links = {};
    delete r.data.relations;
    delete r.data.parentId;
  });
});
add('utf16-context-order', (c) => {
  c.records[0].data.relations.relatedTo = [
    { id: 'EXT-1', title: '\ue000' },
    { id: 'EXT-1', title: '😀' },
    { id: 'EXT-1', title: '𐀀' },
  ];
});
add('late-alias', (c) => {
  c.records[0].data.relations.relatedTo = [
    { id: 'EXT-1' },
    { id: 'EXT-1', uuid: 'native-external', title: 'External' },
  ];
});
add('context-url-choice', (c) => {
  c.records[0].data.relations.relatedTo = [
    { id: 'EXT-1', url: 'https://example.com/z' },
    { id: 'EXT-1', url: 'https://example.com/a' },
  ];
});
add('escaped-body', (c) => {
  c.records[0].data.description = '<> & " \\ \n \u2028 \u2029 😀';
});
add(
  'lone-surrogate',
  (c) => {
    c.records[0].data.description = 'before\ud800after';
  },
  false,
);
add(
  'status-coercion',
  (c) => {
    c.records[2].data.state_reason = { synthetic: true };
  },
  false,
);
add('large-number', (c) => {
  const r = c.records[2];
  r.data.number = 9007199254740991;
  r.links = {};
  c.records = [r];
});
add('priority-array', (c) => {
  c.records[0].data.priority = ['ignored'];
});
for (let seed = 0; seed < 24; seed++)
  add(`permutation-${seed}`, (c) => {
    c.locale = seed % 2 ? 'ko' : 'en';
    c.records[0].data.priority = seed % 3 ? { name: 'High' } : null;
    c.records[0].data.labels = ['가상', 'one'];
    c.records[0].data.updatedAt = '2026-09-20T00:00:00Z';
    c.records[0].data.description = seed % 2 ? 'text '.repeat(seed) : null;
    c.records[2].data.labels = ['a', { name: 'b' }];
    c.records[2].data.assignees =
      seed % 2 ? [{ login: 'one' }, { login: 'two' }] : [];
    c.records[2].data.state = seed % 2 ? 'open' : 'closed';
    c.records[2].data.state_reason = [
      'completed',
      'not_planned',
      'duplicate',
      'future',
    ][seed % 4];
    c.records[2].data.closed_at = null;
    c.records[0].data.relations.relatedTo = [
      { id: 'EXT-1', title: 'Z' },
      { uuid: 'ctx-uuid', id: 'EXT-1', title: 'A' },
      { uuid: 'ctx-uuid', id: 'EXT-1', title: 'B' },
    ];
    for (let i = c.records.length - 1; i > 0; i--) {
      let k = (seed * 17 + i * 7) % (i + 1);
      [c.records[i], c.records[k]] = [c.records[k], c.records[i]];
    }
    if (seed % 2)
      c.records.forEach((r) => r.data.relations?.relatedTo?.reverse());
  });
const invalid = [
  [
    'bad-shape',
    (c) => {
      delete c.owner;
    },
  ],
  [
    'source-id',
    (c) => {
      c.records[0].sourceId = 'unknown';
    },
  ],
  [
    'source-duplicate',
    (c) => {
      c.sources.push(c.sources[0]);
    },
  ],
  [
    'namespace',
    (c) => {
      c.sources[1].namespace = 'UPPER/repo/name';
    },
  ],
  [
    'duplicate-detail',
    (c) => {
      c.records.push(c.records[0]);
    },
  ],
  [
    'alias-conflict',
    (c) => {
      c.records[0].data.relations.relatedTo = [
        { id: 'CONFLICT', uuid: 'a' },
        { id: 'CONFLICT', uuid: 'b' },
      ];
    },
  ],
  [
    'self-edge',
    (c) => {
      c.records[0].data.relations.relatedTo = [
        structuredClone(c.records[0].data),
      ];
    },
  ],
  [
    'cycle',
    (c) => {
      c.records[0].data.parentId = c.records[0].data.id;
    },
  ],
  [
    'unsafe-url',
    (c) => {
      c.records[0].data.url = 'https://user:pass@example.com/a';
    },
  ],
  [
    'bad-date',
    (c) => {
      c.records[0].data.updatedAt = 'invalid';
    },
  ],
  [
    'labels-null',
    (c) => {
      c.records[2].data.labels = null;
    },
  ],
  [
    'labels-element',
    (c) => {
      c.records[2].data.labels = [null];
    },
  ],
  [
    'assignees-object',
    (c) => {
      c.records[2].data.assignees = {};
    },
  ],
  [
    'assignees-element',
    (c) => {
      c.records[2].data.assignees = [{}];
    },
  ],
  [
    'bad-number',
    (c) => {
      c.records[2].data.number = 0;
    },
  ],
  [
    'pull-request',
    (c) => {
      c.records[2].data.pull_request = {};
    },
  ],
  [
    'bad-url',
    (c) => {
      c.records[2].data.html_url = 'javascript:synthetic';
    },
  ],
  [
    'complete-missing',
    (c) => {
      c.sources[0].coverage.relations = 'complete';
    },
  ],
  [
    'endpoint-id',
    (c) => {
      c.records[0].data.relations.relatedTo = [{}];
    },
  ],
  [
    'endpoint-null',
    (c) => {
      c.records[0].data.relations.relatedTo = [null];
    },
  ],
];
for (const [name, modify] of invalid) add(name, modify, false);
writeFileSync(join(out, 'malformed-json.json'), '{bad');
cases.push({ name: 'malformed-json', native: false });
writeFileSync(
  join(out, 'manifest.json'),
  JSON.stringify(cases, null, 2) + '\n',
);
