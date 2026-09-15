import { readFile, open, mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { WorkMapError } from './validate.js';

// Copy a host-provided payload file without asking the model to reproduce it.
// This preserves bytes, not proof of where the input itself came from.
export async function retainResponse(input, output) {
  let bytes;
  try {
    bytes = await readFile(input);
  } catch {
    throw new WorkMapError([
      {
        path: '/response',
        code: 'response-read',
        message: 'Response file could not be read.',
        fix: 'Use an existing host-provided response file; do not reconstruct it from a summary.',
      },
    ]);
  }
  let file;
  try {
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    file = await open(output, 'wx', 0o600);
    await file.writeFile(bytes);
    await file.close();
  } catch {
    if (file) {
      await file.close().catch(() => {});
      await rm(output).catch(() => {});
    }
    throw new WorkMapError([
      {
        path: '/output',
        code: 'response-output',
        message: 'Response file could not be retained at a fresh path.',
        fix: 'Choose a new writable file path. Existing responses are never replaced.',
      },
    ]);
  }
  return {
    retained: true,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceFidelity: 'not-verified',
  };
}
