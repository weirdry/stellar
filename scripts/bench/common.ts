import { createHash } from 'node:crypto';
import {
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { cpus, machine, release } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isDeepStrictEqual } from 'node:util';
import {
  record,
  string,
  required,
  errorCode,
  errorMessage,
} from '../support/values.ts';

export const repo = fileURLToPath(new URL('../../', import.meta.url));
export const directory = fileURLToPath(new URL('./', import.meta.url));
export const measurementProtocol = {
  backend: 'system-time',
  child: 'direct Node process',
  cpu: 'user + system; seconds printed by system time, converted to milliseconds',
  cpu_resolution_ms: 10,
  rss: 'maximum resident set size; bytes on macOS, KiB on Linux, normalized to MiB',
  wall: 'monotonic elapsed milliseconds around synchronous system-time launch; includes wrapper overhead',
} as const;
export function digest(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
export function json(path: string): unknown {
  // Node's default UTF-8 decoder substitutes invalid bytes; references must reject them.
  return JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)),
  );
}
export function writeJSON(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}
export function usageError(message: string): never {
  console.error(`error: ${message}`);
  process.exit(2);
}
export function options(
  names: string[],
  defaults: Record<string, string> = {},
): Record<string, string | boolean | undefined> {
  try {
    const { values } = parseArgs({
      options: {
        help: { type: 'boolean', short: 'h' },
        ...Object.fromEntries(
          names.map((name) => [
            name,
            {
              type: 'string' as const,
              ...(defaults[name] === undefined
                ? {}
                : { default: defaults[name] }),
            },
          ]),
        ),
      },
      strict: true,
    });
    if (values['help']) {
      console.log(
        'Usage: node ' +
          process.argv[1] +
          ' ' +
          names
            .map((name) =>
              defaults[name] === undefined && name !== 'reference'
                ? '--' + name + ' VALUE'
                : '[--' + name + ' VALUE]',
            )
            .join(' '),
      );
      process.exit(0);
    }
    if (!['darwin', 'linux'].includes(process.platform))
      usageError('Requires macOS/Linux and system time.');
    return values;
  } catch (error) {
    usageError(errorMessage(error));
  }
}
export function option(values: Record<string, unknown>, name: string): string {
  const value = values[name];
  if (typeof value !== 'string' || !value)
    usageError(`--${name} requires a value`);
  return value;
}
export function positive(value: string): number {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  )
    usageError('Trials must be a positive integer.');
  return Number(value);
}
export function fresh(path: string): string {
  const output = resolve(path);
  try {
    mkdirSync(output);
  } catch (error) {
    if (errorCode(error) === 'EEXIST')
      usageError('Output directory already exists; choose a fresh path.');
    throw error;
  }
  return output;
}
export function hashes(value: unknown): Record<string, string> {
  const result = record(value),
    entries = Object.entries(result);
  if (
    !entries.length ||
    entries.some(
      ([name, hash]) =>
        !name || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash),
    )
  )
    throw new Error(
      'Artifacts must map nonempty names to SHA-256 hex digests.',
    );
  return Object.fromEntries(
    entries.map(([name, hash]) => [name, string(hash)]),
  );
}
export function child(command: string, args: string[], cwd?: string): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    ...(cwd ? { cwd } : {}),
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${command} exited ${result.status}: ${result.stderr.slice(0, 2000)}`,
    );
  return result.stdout;
}
export function environment(node: string) {
  return {
    platform: `${process.platform} ${release()}`,
    machine: machine(),
    logical_cpus: cpus().length,
    node: child(node, ['--version']).trim(),
    harness_node: process.version,
  };
}
export interface Measurement {
  wall_ms: number;
  cpu_ms: number;
  peak_rss_mib: number;
}
export function parseTime(
  text: string,
  platform: 'darwin' | 'linux',
): Omit<Measurement, 'wall_ms'> {
  const values =
    platform === 'darwin'
      ? [
          text.match(/([\d.]+) user\s+([\d.]+) sys/),
          text.match(/(\d+)\s+maximum resident set size/),
        ]
      : [
          text.match(/^stellar-user=(\S+) system=(\S+)$/m),
          text.match(/^stellar-maxrss=(\d+)$/m),
        ];
  const cpu = required(values[0]),
    rss = required(values[1]);
  const user = Number(cpu[1]),
    system = Number(cpu[2]),
    peak = Number(rss[1]);
  if (
    ![user, system, peak].every((value) => Number.isFinite(value) && value >= 0)
  )
    throw new Error('Invalid system time resource measurements.');
  return {
    cpu_ms: (user + system) * 1000,
    peak_rss_mib: peak / (platform === 'darwin' ? 1048576 : 1024),
  };
}
export function measure(
  node: string,
  args: string[],
  files: { stdout: string; stderr: string; resources: string },
  env: NodeJS.ProcessEnv = process.env,
): Measurement {
  const platform = process.platform;
  if (platform !== 'darwin' && platform !== 'linux')
    throw new Error('Unsupported measurement platform.');
  if (existsSync(files.resources))
    throw new Error('Resource output already exists.');
  const flags =
    platform === 'darwin'
      ? ['-l']
      : ['-f', 'stellar-user=%U system=%S\nstellar-maxrss=%M'];
  const out = openSync(files.stdout, 'wx', 0o600);
  let err: number | undefined;
  try {
    err = openSync(files.stderr, 'wx', 0o600);
    const start = process.hrtime.bigint();
    const result = spawnSync(
      '/usr/bin/time',
      [...flags, '-o', files.resources, node, ...args],
      { stdio: ['ignore', out, err], env: { ...env, LC_ALL: 'C' } },
    );
    const wall_ms = Number(process.hrtime.bigint() - start) / 1e6;
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `Measured command exited ${result.status}; inspect its local stderr.`,
      );
    return {
      wall_ms,
      ...parseTime(readFileSync(files.resources, 'utf8'), platform),
    };
  } finally {
    closeSync(out);
    if (err !== undefined) closeSync(err);
  }
}
export function stageRuntime(root: string) {
  const stage = join(root, 'staged-skill');
  mkdirSync(join(stage, 'bin'), { recursive: true });
  for (const name of ['stellar.mjs', 'stellar.manifest.json'])
    cpSync(join(repo, 'bin', name), join(stage, 'bin', name));
  for (const name of ['schemas', 'assets'])
    cpSync(join(repo, name), join(stage, name), { recursive: true });
  const manifest = record(json(join(stage, 'bin/stellar.manifest.json'))),
    files = hashes(manifest['files']);
  verifyFiles(stage, files);
  return { stage, files, version: string(manifest['version']) };
}
export function contained(root: string, name: string): string {
  const directory = realpathSync(root),
    path = realpathSync(resolve(root, name)),
    rel = relative(directory, path);
  if (rel === '..' || rel.startsWith('../') || directory === path)
    throw new Error('Artifact path escapes its root.');
  return path;
}
export function verifyFiles(root: string, files: Record<string, string>) {
  for (const [name, expected] of Object.entries(files))
    if (digest(contained(root, name)) !== expected)
      throw new Error(`Staged resource differs from manifest: ${name}`);
}
export function listArtifacts(root: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) paths.push(...listArtifacts(path));
    else if (/\.(json|html)$/.test(entry.name)) paths.push(path);
  }
  return paths.sort();
}
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? required(sorted[mid])
    : (required(sorted[mid - 1]) + required(sorted[mid])) / 2;
}
export { random, shuffle } from './random.ts';
export function operation(
  size: number,
  name: string,
  benchmark: string,
  dest: string,
): { command: string[]; pairs: [string, string][] } {
  const data = join(benchmark, 'data', String(size));
  if (name === 'normalize')
    return {
      command: [name, join(data, 'initial-capture.json'), dest],
      pairs: [[dest, join(data, 'draft.json')]],
    };
  if (name === 'render')
    return {
      command: [name, join(data, 'steady/work-map.json'), dest],
      pairs: [[dest, join(data, 'steady/stellar.html')]],
    };
  const [prior, other, expected] =
    name === 'refresh'
      ? (['prior', 'steady-capture.json', 'steady'] as const)
      : (['churn', 'choices.json', 'reviewed'] as const);
  return {
    command: [name, join(data, prior, 'state.json'), join(data, other), dest],
    pairs: ['state.json', 'work-map.json', 'changes.json'].map((file) => [
      join(dest, file),
      join(data, expected, file),
    ]),
  };
}
export { dirname, join, relative, resolve, rmSync, isDeepStrictEqual };
