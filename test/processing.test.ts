import { assertWorkMap } from '../lib/validate.ts';
import { must } from './support.ts';
import { getDiagnostics } from './support.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { applyChoices, rememberMap } from '../lib/continuity.ts';
import { validateWorkMap } from '../lib/validate.ts';
import { mixedMap } from './fixtures.ts';

void test('batch choices preserve source-qualified identity, array order and absent memory', () => {
  const map = mixedMap();
  // Identical native IDs in different providers must never share an entry.
  must(map.issues[0]).nativeId = must(map.issues[2]).nativeId = 'same|["가상"]';
  const state = rememberMap(map);
  state.memory.reverse();
  state.memory.push({
    ...must(structuredClone(state.memory[0])),
    nativeId: 'absent',
  });
  const before = structuredClone(state),
    expected = structuredClone(state);
  const choices = {
    issues: [2, 0].map((index) => {
      const classification = {
        category: 'delivery',
        rationale: `Explicit choice ${index}`,
      };
      const targets = [`Target ${index}`];
      const issue = expected.map.issues[index];
      const saved = expected.memory[map.issues.length - 1 - index];
      must(issue).classification = must(saved).classification = {
        ...classification,
        origin: 'user',
      };
      must(issue).targets = must(saved).targets = targets;
      must(saved).targetsOrigin = 'user';
      return { issueId: must(issue).id, classification, targets };
    }),
  };
  assert.deepEqual(applyChoices(state, choices, 'user'), expected);
  assert.deepEqual(state, before);

  const duplicate = structuredClone(state);
  duplicate.memory.push(must(structuredClone(duplicate.memory[0])));
  assert.throws(
    () => applyChoices(duplicate, choices, 'user'),
    (error) => {
      assert.equal(
        must(getDiagnostics(error)[0]).path,
        `/memory/${duplicate.memory.length - 1}`,
      );
      assert.equal(
        must(getDiagnostics(error)[0]).message,
        'Saved source identity occurs more than once.',
      );
      return true;
    },
  );
});

void test('batch failures preserve the input and identify the first offending choice', () => {
  const previous = rememberMap(mixedMap()),
    id = must(previous.map.issues[0]).id;
  const state = applyChoices(
    previous,
    { issues: [{ issueId: id, targets: ['Pinned'] }] },
    'user',
  );
  const before = structuredClone(state);
  const allowed = {
    issueId: must(state.map.issues[2]).id,
    targets: ['Proposed'],
  };
  for (const [choice, suffix, message] of [
    [
      { issueId: id, targets: ['Overwrite'] },
      'targets',
      'Automatic classification would overwrite user targets.',
    ],
    [
      { issueId: 'unknown', targets: [] },
      'issueId',
      'Choice does not identify a current issue.',
    ],
    [allowed, 'issueId', 'Issue choice is repeated.'],
  ] as const) {
    assert.throws(
      () => applyChoices(state, { issues: [allowed, choice] }, 'agent'),
      (error) => {
        assert.equal(
          must(getDiagnostics(error)[0]).path,
          `/issues/1/${suffix}`,
        );
        assert.equal(must(getDiagnostics(error)[0]).message, message);
        return true;
      },
    );
    assert.deepEqual(state, before);
  }
});

void test('parent validation retains preceding diagnostics and stops at the first cycle', () => {
  const map = assertWorkMap(
    JSON.parse(
      readFileSync(new URL('../examples/museum.json', import.meta.url), 'utf8'),
    ),
  );
  map.issues.forEach((issue) => {
    delete issue.classification;
  });
  map.relations = (
    [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 3],
      [5, 6],
      [6, 5],
    ] as const
  ).map(([source, target]) => ({
    kind: 'parent' as const,
    source: must(map.issues[source]).id,
    target: must(map.issues[target]).id,
  }));
  must(must(map.attachments)[0]).href = '../outside';
  const expected = map.issues.flatMap((issue: { scope: string }, n) =>
    issue.scope === 'assigned'
      ? [
          {
            code: 'missing-classification',
            path: `/issues/${n}/classification`,
            message: 'In-scope issue has no primary classification.',
            fix: 'Assign one existing category with rationale and origin.',
          },
        ]
      : [],
  );
  const attachment = {
    code: 'unsafe-attachment',
    path: '/attachments/0/href',
    message: 'Reference URL is not a safe web or report-relative path.',
    fix: 'Use HTTP(S) without credentials or a relative file below the report directory.',
  };
  assert.deepEqual(validateWorkMap(map), {
    valid: false,
    diagnostics: [
      ...expected,
      {
        code: 'parent-cycle',
        path: '/relations/2',
        message: 'Source parent hierarchy contains a cycle.',
        fix: 'Correct parent direction or endpoints against the source.',
      },
      attachment,
    ],
  });
  // Both disjoint hierarchies become acyclic; earlier errors still survive.
  map.relations = map.relations.filter((_, n: number) => n !== 3 && n !== 5);
  assert.deepEqual(validateWorkMap(map), {
    valid: false,
    diagnostics: [...expected, attachment],
  });
});
