import { isObject, property } from './contracts.ts';
import type { BinaryLike } from 'node:crypto';
import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { version } from './version.ts';

// Only these product files are read. A manifest cannot select arbitrary paths.
export const runtimeFiles = [
  'bin/stellar.mjs',
  'schemas/work-map.schema.json',
  'schemas/capture.schema.json',
  'schemas/choices.schema.json',
  'schemas/state.schema.json',
  'assets/viewer/shell.html',
  'assets/viewer/style.css',
  'assets/viewer/app.js',
  'assets/viewer/stellar.svg',
  'assets/viewer/locales/en.json',
  'assets/viewer/locales/ko.json',
];
export const manifestPath = 'bin/stellar.manifest.json';
export const sha256 = (bytes: BinaryLike) =>
  createHash('sha256').update(bytes).digest('hex');

const remedy =
  'Reinstall the selected Stellar ref with the skills installer. In a checkout, run just build-runner after intentional source/resource changes.';
const scope =
  'Local Node and build-manifest consistency only. This does not verify release authenticity, host skill discovery, source authentication, live collection, or browser behavior.';

interface DoctorCheck {
  id: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  fix?: string;
}
interface BuildManifest {
  version: string;
  files: Record<string, string>;
}
function validManifest(parsed: unknown): parsed is BuildManifest {
  if (!isObject(parsed) || parsed['version'] !== version) return false;
  const files = parsed['files'];
  return (
    isObject(files) &&
    !Array.isArray(files) &&
    Object.keys(files).length === runtimeFiles.length &&
    runtimeFiles.every((path) => {
      const hash = files[path];
      return (
        Object.hasOwn(files, path) &&
        typeof hash === 'string' &&
        /^[a-f0-9]{64}$/.test(hash)
      );
    })
  );
}
export async function doctor() {
  const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
  const checks: DoctorCheck[] = [];
  const add = (
    id: string,
    status: DoctorCheck['status'],
    message: string,
    fix?: string,
  ) => checks.push({ id, status, message, ...(fix ? { fix } : {}) });
  const supported = process.versions.node.split('.')[0] === '24';
  add(
    'node',
    supported ? 'pass' : 'fail',
    `Running Node.js ${process.versions.node}; required: 24.x.`,
    supported ? undefined : 'Run Stellar with Node.js 24.x.',
  );

  const read = async (path: string) => {
    try {
      if (!(await stat(join(root, path))).isFile()) {
        add(path, 'fail', 'Required path is not a regular file.', remedy);
        return null;
      }
      return await readFile(join(root, path));
    } catch (error) {
      add(
        path,
        'fail',
        property(error, 'code') === 'ENOENT'
          ? 'Required file is missing.'
          : 'Required file cannot be read.',
        remedy,
      );
      return null;
    }
  };
  let manifest: BuildManifest | undefined;
  const bytes = await read(manifestPath);
  if (bytes !== null) {
    try {
      const parsed: unknown = JSON.parse(bytes.toString('utf8'));
      if (!validManifest(parsed)) throw new Error('Invalid manifest');
      manifest = parsed;
      add(manifestPath, 'pass', 'Build manifest matches the running version.');
    } catch {
      // Do not print parser errors or file contents from a damaged installation.
      add(
        manifestPath,
        'fail',
        'Build manifest is invalid or for another version.',
        remedy,
      );
    }
  }
  for (const path of runtimeFiles) {
    const content = await read(path);
    if (content === null) continue;
    if (!manifest) {
      add(
        path,
        'skip',
        'File is readable; integrity needs a valid build manifest.',
      );
    } else if (sha256(content) !== manifest.files[path]) {
      add(
        path,
        'fail',
        'File differs from the bundled build manifest.',
        remedy,
      );
    } else {
      add(path, 'pass', 'File matches the bundled build manifest.');
    }
  }
  return {
    version,
    root,
    ok: checks.every((check) => check.status === 'pass'),
    checks,
    scope,
  };
}

export function formatDoctor(result: Awaited<ReturnType<typeof doctor>>) {
  return [
    `Stellar ${result.version}`,
    `Installation: ${result.root}`,
    ...result.checks.map(
      ({ id, status, message, fix }) =>
        `${status.toUpperCase()} ${id}: ${message}${fix ? `\n  Next: ${fix}` : ''}`,
    ),
    result.ok
      ? 'Local installation checks passed.'
      : 'Local installation needs attention.',
    result.scope,
  ].join('\n');
}
