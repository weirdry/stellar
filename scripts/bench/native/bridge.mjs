// Benchmark-only synchronous boundary. Never imported by the product build.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
export function nativeProbe(records, locale) {
  const brief = ({ id, provider }) => ({ id, provider });
  const prepared = records.map(({ entry, source, relations }) => {
    const raw = { ...entry.data };
    delete raw.relations;
    delete raw.parentId;
    return {
      source: brief(source),
      raw,
      scope: entry.scope,
      rels: relations.map(({ source, ref, kind, reverse }) => ({
        source: brief(source),
        ref,
        kind,
        reverse: !!reverse,
      })),
    };
  });
  const input = JSON.stringify({ locale, records: prepared });
  // JSON.stringify emits lone surrogates as escapes. Preserve their JS semantics
  // through the original path; Go's decoder would replace them. False positives
  // (literal escape text) also fall back and are never credited as native work.
  if (/\\u[dD][89a-fA-F][0-9a-fA-F]{2}/.test(input))
    throw new Error('surrogate escape');
  const child = spawnSync(process.env.STELLAR_NATIVE_WORKER, [], {
    input,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
  });
  if (child.error || child.status !== 0) throw new Error('worker failed');
  const result = JSON.parse(child.stdout);
  return result;
}
export function probeReceipt(outcome) {
  if (process.env.STELLAR_NATIVE_RECEIPT)
    writeFileSync(
      process.env.STELLAR_NATIVE_RECEIPT,
      JSON.stringify({ outcome }),
    );
}
