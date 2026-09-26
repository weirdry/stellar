// Optional preload for a synthetic staged CLI run; no product instrumentation.
import { Session } from 'node:inspector/promises';
import { writeFileSync } from 'node:fs';

const destination = process.env['STELLAR_HEAP_PROFILE'];
if (!destination)
  throw new Error('STELLAR_HEAP_PROFILE must name a fresh output file.');
const output = destination;
const session = new Session();
session.connect();
const parameters = {
  samplingInterval: 524288,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
};
await session.post('HeapProfiler.startSampling', parameters);
async function finish() {
  try {
    const { profile } = await session.post('HeapProfiler.stopSampling');
    writeFileSync(output, JSON.stringify({ parameters, profile }), {
      flag: 'wx',
      mode: 0o600,
    });
  } finally {
    session.disconnect();
  }
}
process.once('beforeExit', () => {
  void finish().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
});
