# Native experiment review corrections

Date: 2026-09-21

Scope: the two P3 findings from independent review of
[PR #32](https://github.com/weirdry/stellar/pull/32) at
`ad8ef5292dc18947e1e23277e69bea6ea7abcd05`, tracking
[issue #31](https://github.com/weirdry/stellar/issues/31).

## Corrections

- **P3-1, canonical-suite attribution:** the experiment procedure, quality
  chapter and original validation record now explicitly describe Go/Rust suite
  modes as mixed native execution, JavaScript fallback and pre-worker rejection.
  Suite success alone does not establish native execution. The existing receipt
  assertions in designated differential cases and every timed native invocation
  remain unchanged; no per-assertion native coverage is claimed.
- **P3-2, staging before preflight:** the stager reads the normalizer and requires
  exactly one insertion anchor before creating its output directory or copying
  any resources. A missing or repeated anchor leaves the requested stage path
  absent. This correction does not promise cleanup of the outer native-build
  directory or errors after staging has begun.
- A comment explains why the experimental bundle is also written to the staged
  `bin/stellar.js`: the canonical CLI test invokes that path, so its isolated copy
  must use the probe. The product entry point is unchanged.

## Executed checks

The checks used disposable tracked-file copies of the reviewed revision, with
only the stager replaced in the corrected copy. Synthetic sentinels and all
generated outputs remained outside the repository. Node was 24.19.0 on macOS
arm64. Direct `node scripts/bench/native/stage.mjs FRESH_OUTPUT` invocations
isolated the stager from native compilation and the outer build directory.

- With the old stager, both a removed and a duplicated insertion anchor exited
  1 with `Normalizer insertion boundary moved`, but left `bin/`, `schemas/` and
  `assets/` in the output directory, without `build-sources.json`.
- With the corrected stager, both anchor cases exited 1 with the same guard
  error, without creating the requested output path.
- Existing output files and directories were rejected in both versions. File
  bytes, a directory's binary sentinel and its complete file inventory were
  preserved. These four checks plus the four anchor checks cover eight controls.
- Successful old/new staging produced the same 30-file inventory. Only
  `build-sources.json` differed, and only its `scripts/bench/native/stage.mjs`
  entry changed. All 29 other files were byte-identical within the shared
  dependency-resolution context.
- A fresh stage from the working checkout produced probe SHA-256
  `75f172420f6e702b04f09a2edcdfb18c74e2ee726cc2dfa0c4d0157ff195d4f3`,
  exactly matching the retained measurement record. The corrected stager's
  source SHA-256 is
  `91d2f73c63e62ba65bf3f1496cb34894b2f69ca0df34d2958b9513b399ae76d7`.
- `node --test STAGE/test/normalize.test.js` passed **15/15 tests**, zero skips,
  against the freshly staged modules and CLI with the worker disabled. This
  verifies the successful staging path; it is not a new native-worker replay.
- `just native-compare` rejected the old stage with `Build source changed:
scripts/bench/native/stage.mjs; rebuild explicitly.` before creating its
  output directory or loading the baseline workload.

Final repository checks and hosted-CI evidence are recorded in the delivery PR
after execution. Native build flags, the comparison harness and worker
implementations are unchanged.

## Preserved evidence and limits

The [original raw measurements](data/2026-09-20-native-normalize/results.json)
are unchanged, including SHA-256
`0e220c18689d98869294b87cbbc062b2193e17976533444158d1fecc7484648e`.
Their source hashes continue to identify the measured implementation at
`ad8ef529`; the earlier parent revision in the record remains explained in the
[original study](2026-09-20-native-normalize-comparison.md). The corrected stager
must be used for a new build; an old build still correctly fails the harness's
source-drift check. Historical hashes were not replaced with unmeasured ones.

The successful generated code is unchanged, so no full-scale timing rerun or
native rebuild was needed for this correction. Go/Rust binary reproducibility,
automatic validation-record hash checking and canonical-suite receipt counts
remain optional follow-ups, not implemented outcomes.

Product source, bundle/manifest, schemas, viewer, dependencies and raw timing
rows are unchanged. No new local browser/visual check, other-platform execution,
skill installation, live-source access, release or runtime acceptance is claimed.
The separate standalone-native experiment and TypeScript planning are outside
this correction.
