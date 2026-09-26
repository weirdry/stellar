import { errorCode, errorMessage } from './support/values.ts';
import { lstat, mkdir, realpath, symlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const destination = join(homedir(), '.agents', 'skills', 'stellar');
try {
  const existing = await lstat(destination).catch((error: unknown) => {
    if (errorCode(error) === 'ENOENT') return null;
    throw error;
  });
  if (existing) {
    if (
      !existing.isSymbolicLink() ||
      (await realpath(destination).catch(() => null)) !== root
    )
      throw new Error(
        'A different stellar skill already exists; inspect it before replacing anything.',
      );
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await symlink(root, destination, 'dir');
  }
  console.log(JSON.stringify({ linked: true, destination, root }));
} catch (error) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
