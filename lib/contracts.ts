import { readFileSync } from 'node:fs';
import type { Schema, ErrorObject } from 'ajv';
import type { StellarWorkMap } from '../types/generated/work-map.d.ts';
import type { StellarHostCapture } from '../types/generated/capture.d.ts';
import type { StellarClassificationChoices } from '../types/generated/choices.d.ts';
import type { StellarSavedClassificationState } from '../types/generated/state.d.ts';

export type WorkMap = StellarWorkMap;
export type Capture = StellarHostCapture;
export type Choices = StellarClassificationChoices;
export type State = StellarSavedClassificationState;
export type Issue = WorkMap['issues'][number];
export type Source = WorkMap['sources'][number];
export type Relation = WorkMap['relations'][number];
export type Memory = State['memory'][number];
export type Identity = Pick<Memory, 'provider' | 'namespace' | 'nativeId'>;
export type InputRole = 'work-map' | 'capture' | 'choices' | 'state';
export interface Diagnostic {
  code: string;
  path: string;
  message: string;
  fix: string;
  input?: InputRole | 'html';
  cleanup?: string;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
export function property(value: unknown, key: string): unknown {
  return isObject(value) ? value[key] : undefined;
}
export function loadSchema(url: URL): Schema {
  const value: unknown = JSON.parse(readFileSync(url, 'utf8'));
  if (typeof value === 'boolean') return value;
  if (
    isObject(value) &&
    (value['$async'] === undefined || value['$async'] === false)
  )
    return value;
  throw new TypeError('Schema must be an object or boolean.');
}
// Ajv's keyword params are externally typed as any. Only string field names
// may enter diagnostic paths; parser/schema contents are never copied here.
export function schemaProperty(error: ErrorObject): string | undefined {
  const params: unknown = error.params;
  const name =
    property(params, 'missingProperty') ??
    property(params, 'additionalProperty');
  return typeof name === 'string' ? name : undefined;
}
// Call only after the owning schema/semantic check establishes the invariant.
// A missing value is still rejected at runtime instead of hidden by a TS cast.
export function required<T>(value: T | undefined, invariant: string): T {
  if (value === undefined) throw new Error(invariant);
  return value;
}
