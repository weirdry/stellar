// Entirely invented, deterministic refresh workload shared by tests and replay.
import { rememberMap, applyChoices } from '../../lib/continuity.ts';
import { mixedCapture, mixedMap } from '../../test/fixtures.ts';
import { required } from '../../lib/contracts.ts';

export function refreshFixture() {
  const original = mixedCapture();
  const source = required(original.sources[0], 'Synthetic source exists.');
  const template = required(original.records[0], 'Synthetic record exists.');
  const names = [
    'unchanged',
    'status',
    'append',
    'purpose',
    'reference',
    'user',
    'unheaded',
  ];
  const body =
    '# Purpose\r\nEvaluate sensor drift.\r\n' +
    'Keep calibration samples and inspect experimental error.\r\n'.repeat(160) +
    'Reference: https://example.test/calibration?revision=old\r\n' +
    'Do not implement operational alerts.\r\n';
  const capture = {
    ...original,
    sources: [source],
    records: names.map((name, index) => ({
      sourceId: source.id,
      scope: 'assigned' as const,
      data: {
        ...template.data,
        status: 'Investigating',
        statusType: 'started',
        id: `SYN-${index + 1}`,
        uuid: `synthetic-refresh-${name}`,
        title: `Synthetic ${name} calibration work`,
        url: `https://linear.app/observatory/issue/SYN-${index + 1}`,
        description:
          name === 'unheaded'
            ? 'Measure seasonal sensor drift using archived calibration samples. '.repeat(
                160,
              )
            : body,
        relations: {
          relatedTo:
            index === 2
              ? [{ id: 'SYN-1', uuid: 'synthetic-refresh-unchanged' }]
              : [],
          blocks: [],
          blockedBy: [],
          duplicateOf: null,
        },
      },
    })),
  };
  const map = mixedMap(capture);
  let previous = rememberMap(map);
  const user = required(
    map.issues.find((issue) => issue.identifier === 'SYN-6'),
    'User case exists.',
  );
  previous = applyChoices(
    previous,
    {
      issues: [
        {
          issueId: user.id,
          classification: {
            category: 'transit',
            rationale: 'User keeps this work in calibration research.',
          },
          targets: ['User-selected instrument'],
        },
      ],
    },
    'user',
  );
  const next = structuredClone(capture);
  required(next.records[1], 'Status case exists.').data['statusType'] =
    'completed';
  required(next.records[1], 'Status case exists.').data['status'] = 'Done';
  required(next.records[2], 'Append case exists.').data.description +=
    'Progress: second experiment completed.\r\n';
  required(next.records[3], 'Purpose case exists.').data.title =
    'Implement production alert delivery';
  required(next.records[3], 'Purpose case exists.').data.description =
    'Implement alert delivery.\r\n' +
    body +
    'Decision: replace the earlier scope with operational alerts.\r\n';
  required(next.records[4], 'Reference case exists.').data.description =
    body.replace('revision=old', 'revision=new');
  required(next.records[5], 'User case exists.').data.description +=
    'New source scope: operational alerts, outside calibration research.\r\n';
  required(next.records[6], 'Unheaded case exists.').data.description =
    'Evaluate calibration error with archived instrument readings. '.repeat(
      160,
    );
  const added = structuredClone(required(next.records[0], 'Template exists.'));
  added.data.id = 'SYN-8';
  added.data.uuid = 'synthetic-refresh-new';
  added.data.title = 'New calibration experiment';
  added.data.url = 'https://linear.app/observatory/issue/SYN-8';
  added.data.description =
    'Evaluate a new instrument; do not change production alerts.';
  next.records.push(added);
  return { previous, capture: next };
}
