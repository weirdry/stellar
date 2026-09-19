import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Entirely invented inputs. Keep ordering and text stable across benchmark runs.
const sources = ['linear', 'github'].map((provider) => ({
  id: `${provider}-bench`,
  provider,
  name: `Synthetic ${provider}`,
  namespace:
    provider === 'linear'
      ? 'synthetic-benchmark'
      : 'github.com/example/synthetic-benchmark',
  scope: 'Invented benchmark records only.',
  snapshotAt: '2026-09-20T00:00:00Z',
  coverage: { issues: 'complete', relations: 'partial' },
  notes: 'Entirely invented benchmark capture; no live source calls.',
}));
const ref = (i) =>
  i % 2 === 0
    ? { id: `BENCH-${i}`, uuid: `synthetic-linear-${i}` }
    : {
        node_id: `SYNTHETIC_GH_${i}`,
        number: i + 1,
        html_url: `https://github.com/example/synthetic-benchmark/issues/${i + 1}`,
      };
const category = (issue) =>
  `group-${Number(issue.nativeId.match(/\d+$/)[0]) % 32}`;
const load = (file) => JSON.parse(readFileSync(file, 'utf8'));
const save = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function capture(n, mode) {
  const ids = Array.from({ length: n }, (_, i) => i);
  const current =
    mode === 'churn'
      ? ids
          .filter((i) => i % 10 !== 0)
          .concat(Array.from({ length: n / 10 }, (_, i) => n + i))
      : ids;
  const records = [];
  for (const parity of [0, 1]) {
    const group = current.filter((i) => i % 2 === parity);
    for (const [j, i] of group.entries()) {
      let title = `Synthetic benchmark issue ${i} 가상 데이터`;
      let body =
        'Invented benchmark description. No real project or user data. '.repeat(
          3,
        ) + i;
      if (mode !== 'initial' && i % 20 === 0)
        title += ' revised by synthetic capture';
      if (mode === 'churn' && i % 7 === 0) body += ' changed purpose evidence';
      const done = mode !== 'initial' && i % 11 === 0;
      const blocks = [
        ref(group[(j + 1) % group.length]),
        ref(group[(j + 17) % group.length]),
      ];
      const parent = j > 0 ? group[Math.floor((j - 1) / 2)] : null;
      if (parity === 0) {
        records.push({
          sourceId: 'linear-bench',
          scope: 'assigned',
          data: {
            ...ref(i),
            title,
            description: body,
            status: done ? 'Done' : 'Active',
            statusType: done ? 'completed' : 'started',
            relations: {
              blocks,
              blockedBy: [],
              relatedTo: [],
              duplicateOf: null,
            },
            ...(parent === null ? {} : { parentId: `BENCH-${parent}` }),
          },
        });
      } else {
        records.push({
          sourceId: 'github-bench',
          scope: 'assigned',
          data: {
            ...ref(i),
            title,
            body,
            state: done ? 'closed' : 'open',
            state_reason: done ? 'completed' : null,
            assignees: [],
            labels: [],
          },
          links: {
            blocks,
            blockedBy: [],
            children: [],
            parent: parent === null ? null : ref(parent),
          },
        });
      }
    }
  }
  return {
    owner: 'Synthetic benchmark',
    locale: 'en',
    view: { initialScope: 'all', exportName: 'synthetic-benchmark' },
    sources: sources.map((s) => ({
      ...s,
      snapshotAt: mode === 'initial' ? s.snapshotAt : '2026-09-21T00:00:00Z',
    })),
    records,
  };
}

const [operation, input, output] = process.argv.slice(2);
if (operation === 'generate') {
  for (const n of output.split(',').map(Number)) {
    const dir = join(input, String(n));
    mkdirSync(dir);
    for (const mode of ['initial', 'steady', 'churn'])
      save(join(dir, `${mode}-capture.json`), capture(n, mode));
  }
} else if (operation === 'author') {
  const map = load(input);
  map.domains = [
    {
      id: 'benchmark',
      label: 'Synthetic benchmark',
      description: 'Invented purpose groups for performance measurement.',
    },
  ];
  map.categories = Array.from({ length: 32 }, (_, i) => ({
    id: `group-${i}`,
    domain: 'benchmark',
    label: `Synthetic outcome ${i}`,
    basis: 'Synthetic grouping only; no inferred real work.',
  }));
  for (const issue of map.issues) {
    issue.classification = {
      category: category(issue),
      rationale: 'Explicitly authored synthetic fixture classification.',
      origin:
        Number(issue.nativeId.match(/\d+$/)[0]) % 4 === 0 ? 'user' : 'agent',
    };
    issue.targets = ['Synthetic benchmark outcome'];
  }
  save(output, map);
} else if (operation === 'choices') {
  const state = load(input);
  save(output, {
    issues: state.map.issues
      .filter((i) => !i.classification)
      .map((i) => ({
        issueId: i.id,
        classification: {
          category: category(i),
          rationale: 'Explicit synthetic benchmark reclassification.',
        },
        targets: ['Synthetic benchmark outcome'],
      })),
  });
} else if (operation === 'continuity') {
  const prior = load(input),
    next = load(output);
  const old = new Map(prior.map.issues.map((i) => [i.id, i]));
  const users = next.map.issues.filter(
    (i) => i.classification?.origin === 'user',
  );
  const churn = next.changes.added.length > 0,
    n = next.map.issues.length;
  assert.equal(users.length, n / (churn ? 5 : 4));
  assert.equal(next.changes.preservedUser.length, users.length);
  for (const issue of users) {
    assert.deepEqual(issue.classification, old.get(issue.id).classification);
    assert.deepEqual(issue.targets, old.get(issue.id).targets);
  }
  assert.equal(next.changes.added.length, churn ? n / 10 : 0);
  assert.equal(next.changes.notObserved.length, churn ? n / 10 : 0);
  assert.equal(next.changes.review.length, 0);
} else {
  throw new Error('Unknown benchmark fixture operation.');
}
