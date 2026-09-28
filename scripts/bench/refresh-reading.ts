// Compare exact retained evidence views; no model/token or timing claims.
import assert from 'node:assert/strict';
import { refreshFixture } from './refresh-fixture.ts';
import { readRefresh } from '../../lib/refresh-reading.ts';
import { refreshState } from '../../lib/continuity.ts';
import { fresh, option, options, writeJSON, join, digest } from './common.ts';
import { repo } from './common.ts';
const output = fresh(option(options(['output']), 'output'));
const { previous, capture } = refreshFixture();
writeJSON(join(output, 'previous.json'), previous);
writeJSON(join(output, 'capture.json'), capture);
const index = readRefresh(previous, capture);
if (index.kind !== 'refresh-index') throw new Error('Expected index.');
writeJSON(join(output, 'index.json'), index);
const taxonomy = readRefresh(previous, capture, '', 'taxonomy');
writeJSON(join(output, 'taxonomy.json'), taxonomy);
const bytes = (value: unknown) =>
  Buffer.byteLength(JSON.stringify(value, null, 2) + '\n');
const commonBytes = bytes(index) + bytes(taxonomy);
const rows: {
  identifier: string;
  attention: string;
  modes: { view: string; pages: number; bytes: number }[];
}[] = [];
for (const item of index.items) {
  const modes = [];
  for (const view of ['focus', 'full']) {
    let offset: number | null = 0,
      totalBytes = 0,
      pages = 0;
    do {
      const page = readRefresh(previous, capture, item.id, view, offset);
      if (page.kind !== 'refresh-evidence')
        throw new Error('Expected evidence.');
      // Every returned span is a literal slice of the same retained workload.
      const before = previous.map.issues.find((i) => i.id === item.id);
      const after = refreshState(previous, capture).map.issues.find(
        (i) => i.id === item.id,
      );
      for (const chunk of page.items) {
        const field = chunk.field === 'title' ? 'title' : 'description';
        const source = chunk.side === 'before' ? before : after;
        assert.equal(
          chunk.text,
          Array.from(source?.[field] ?? '')
            .slice(chunk.start, chunk.end)
            .join(''),
        );
      }
      writeJSON(
        join(output, `${item.identifier}-${view}-${offset}.json`),
        page,
      );
      totalBytes += bytes(page);
      pages++;
      offset = page.nextOffset;
    } while (offset !== null);
    modes.push({ view, pages, bytes: totalBytes });
  }
  rows.push({ identifier: item.identifier, attention: item.attention, modes });
}
const current = refreshState(previous, capture);
writeJSON(join(output, 'choices.json'), {
  issues: current.changes.review.map(({ issueId }) => {
    const issue = current.map.issues.find((i) => i.id === issueId);
    return {
      issueId,
      classification: {
        category: issue?.identifier === 'SYN-4' ? 'control' : 'transit',
        rationale:
          issue?.identifier === 'SYN-4'
            ? 'The explicit final decision replaces research with operational alert implementation.'
            : 'The invented current evidence remains calibration research; representational or progress changes are reviewed explicitly.',
      },
    };
  }),
});
const report = {
  scope:
    'Same six-issue workload, including changed user-owned evidence. Pretty JSON UTF-8 bytes plus newline; common index and full taxonomy included in both totals. In-process serialization, not model telemetry or hosted tool-call measurement.',
  previousHash: digest(join(output, 'previous.json')),
  captureHash: digest(join(output, 'capture.json')),
  readerHash: digest(join(repo, 'lib/refresh-reading.ts')),
  commonBytes,
  rows,
  totals: ['focus', 'full'].map((view) => ({
    view,
    bytes:
      commonBytes +
      rows.reduce(
        (sum, row) =>
          sum + (row.modes.find((m) => m.view === view)?.bytes ?? 0),
        0,
      ),
    pages:
      2 +
      rows.reduce(
        (sum, row) =>
          sum + (row.modes.find((m) => m.view === view)?.pages ?? 0),
        0,
      ),
  })),
};
writeJSON(join(output, 'results.json'), report);
console.log(JSON.stringify(report, null, 2));
