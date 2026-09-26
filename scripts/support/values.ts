/** Narrow external JSON and exceptions before using their fields. */
export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('Expected a JSON object.');
  return value as Record<string, unknown>;
}
export function string(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('Expected a string.');
  return value;
}
export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError('Expected an array.');
  return value;
}
export function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error('Required value is missing.');
  return value;
}
export function errorCode(error: unknown): unknown {
  return error !== null && typeof error === 'object' && 'code' in error
    ? error.code
    : undefined;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
