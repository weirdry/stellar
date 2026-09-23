import { property } from './contracts.ts';
import { readFile, open, mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { WorkMapError } from './validate.ts';

// Copy a host-provided payload file without asking the model to reproduce it.
// This preserves bytes, not proof of where the input itself came from.
export async function retainResponse(input: string, output: string) {
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
  let creatingParents = true;
  try {
    await mkdir(dirname(output), { recursive: true, mode: 0o700 });
    creatingParents = false;
    file = await open(output, 'wx', 0o600);
    await file.writeFile(bytes);
    await file.close();
  } catch (error) {
    if (file) {
      await file.close().catch(() => {});
      await rm(output).catch(() => {});
    }
    let code = 'response-output';
    let message = 'Response file could not be retained at a fresh path.';
    let fix =
      'Choose a new writable file path. Existing responses are never replaced.';
    if (
      property(error, 'code') === 'ENOTDIR' ||
      (creatingParents && property(error, 'code') === 'EEXIST')
    ) {
      code = 'response-parent';
      message = 'A response destination parent is not a directory.';
      fix = 'Choose a path whose parents are directories; keep existing files.';
    } else if (
      property(error, 'code') === 'EEXIST' ||
      property(error, 'code') === 'EISDIR'
    ) {
      code = 'response-exists';
      message = 'Response destination already exists.';
      fix = 'Choose a fresh unused file path; keep the existing destination.';
    } else if (
      property(error, 'code') === 'EACCES' ||
      property(error, 'code') === 'EPERM'
    ) {
      code = 'response-permission';
      message = 'Response destination is not writable.';
      fix =
        'Check destination-directory permissions or choose a writable directory; keep existing responses.';
    }
    throw new WorkMapError([{ path: '/output', code, message, fix }]);
  }
  return {
    retained: true,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    sourceFidelity: 'not-verified',
  };
}
