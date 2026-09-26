import type { Diagnostic } from '../lib/contracts.ts';
import assert from 'node:assert/strict';
import { WorkMapError } from '../lib/validate.ts';

/** Assert fixture/DOM invariants instead of erasing unchecked indexed access. */
export function must<T>(value: T | undefined | null): T {
  assert.notEqual(value, undefined);
  assert.notEqual(value, null);
  if (value === undefined || value === null)
    throw new Error('Missing fixture value');
  return value;
}
export function getDiagnostics(error: unknown) {
  assert.ok(error instanceof WorkMapError);
  return error.diagnostics;
}

/** CLI JSON is untrusted; assertions narrow each field used by the tests. */
export function record(value: unknown): Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
  );
  return value as Record<string, unknown>;
}
export function array(value: unknown): unknown[] {
  assert.ok(Array.isArray(value));
  return value as unknown[];
}
export function string(value: unknown): string {
  assert.ok(typeof value === 'string');
  return value;
}
export function parse(text: string): unknown {
  return JSON.parse(text);
}
export function objectJSON(text: string) {
  return record(parse(text));
}
export function diagnostic(value: unknown): Diagnostic {
  const row = record(value),
    input = row['input'],
    cleanup = row['cleanup'];
  assert.ok(
    input === undefined ||
      input === 'capture' ||
      input === 'work-map' ||
      input === 'choices' ||
      input === 'state' ||
      input === 'html',
  );
  return {
    code: string(row['code']),
    path: string(row['path']),
    message: string(row['message']),
    fix: string(row['fix']),
    ...(input === undefined ? {} : { input }),
    ...(cleanup === undefined ? {} : { cleanup: string(cleanup) }),
  };
}
export function failure(text: string) {
  const value = objectJSON(text);
  assert.ok(typeof value['valid'] === 'boolean');
  return {
    valid: value['valid'],
    diagnostics: array(value['diagnostics']).map(diagnostic),
  };
}
export function doctorJSON(text: string) {
  const value = objectJSON(text);
  assert.ok(typeof value['ok'] === 'boolean');
  return {
    ok: value['ok'],
    root: string(value['root']),
    version: string(value['version']),
    scope: string(value['scope']),
    checks: array(value['checks']).map((item) => {
      const check = record(item),
        status = check['status'],
        fix = check['fix'];
      assert.ok(status === 'pass' || status === 'fail' || status === 'skip');
      return {
        id: string(check['id']),
        status,
        message: string(check['message']),
        ...(fix === undefined ? {} : { fix: string(fix) }),
      };
    }),
  };
}
