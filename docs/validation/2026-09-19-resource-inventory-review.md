# Resource inventory review corrections

Date: 2026-09-19

Scope: the two P3 resource-check findings and the redundant assertion noted in
the independent review of [PR #26](https://github.com/weirdry/stellar/pull/26)
at `55c3ff6e8d9abb70cbc0a300b0a6441129efaaad`, tracked by
[issue #25](https://github.com/weirdry/stellar/issues/25).

## Changes and evidence

- **Hidden files:** discovery skips names starting with `.` before calling
  `stat`. Editor lock symlinks such as `assets/viewer/.#app.js` and OS metadata
  such as `assets/viewer/._app.js` no longer block comparison or generation.
  Regression cases include hidden files in all three scanned directories and
  a dangling editor lock symlink. Both modes succeed with unchanged generated
  bytes and preserve the ignored files and symlink target. A separate replay
  tested the lock and OS file individually: the script at `55c3ff6` exits `1`
  for both modes, while the corrected script exits `0` with identical artifacts.
- **Duplicate diagnostics:** inventory failures now name duplicate paths in a
  dedicated `Duplicate entries` line. A regression duplicates
  `schemas/state.schema.json` in the fixed list and requires that path in the
  diagnostic. Both comparison and generation fail before artifact writes and
  leave the intentionally damaged list intact.
- **Non-file resources:** replacing the required state schema with a directory
  exercises the regular-file failure branch in both modes. The existing missing
  schema case now covers both modes too; generated artifacts stay unchanged.
- **Metadata assertion:** removed the assertion that searched pre-edit bytes
  for a marker introduced only by the edit. The actual post-check and
  post-generation byte comparisons remain and continue to prove metadata-only
  changes do not affect artifacts.

The existing resource-coverage test in
[distribution.test.js](../../test/distribution.test.js) owns these cases.
[Build guidance](../development/distribution.md#runtime-files) now specifies the
non-hidden runtime naming rule and the diagnostic behavior; the quality current
view links the coverage. Doctor still uses the unchanged fixed allowlist.

## Checks and artifact identity

- `just format` and `just build-runner`: formatting and explicit regeneration
  completed. The runner, manifest, and third-party notices are byte-identical to
  `55c3ff6`; the correction only changes contributor tooling, tests, and docs.
- `just test`: **84/84 Node tests passed**, zero skips, including the expanded
  resource coverage and existing isolated installed-layout continuity replay.
- `just ci`: **84/84 Node tests passed**, zero skips; documentation, all eight
  diagram consistency sets, formatting/lint, repository checks, and generated
  artifact currency passed.

The runner remains **368,658 bytes**. Artifact hashes match the
[original validation record](2026-09-19-cli-help-resource-checks.md):

| Artifact                    | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `bin/stellar.mjs`           | `377817998e41fafd354cb0ae73a150287c518f2457c68835f5f785b6957659f3` |
| `bin/stellar.manifest.json` | `247f44cef3050265ef9c3a8db223050e49fe0075756808cced3641b8c4539bd2` |

## Evidence boundaries

All mutations use disposable synthetic copies. No user skill, report, state,
or host configuration was changed. CLI runtime code, schemas, viewer assets,
diagrams, dependencies, product version, and `SKILL.md` are unchanged.

No local browser or visual review, actual installer run, host discovery, live
source access, Windows check, or additional Node-version validation was performed.
Hosted results for the follow-up revision are tracked separately in the PR and
issue; the original run does not validate this correction. Independent re-review,
dev integration, release, and runtime acceptance remain separate outcomes.
