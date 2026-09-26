# TypeScript gate review corrections

Date: 2026-09-23

Scope: focused follow-up to PR #37 at
`c355c3869b86503d7ff5e2574b5fd81123a48bdf`, with unchanged base
`bb206d77a133498ca8308362b4e7acc40159c75d`. This record covers contributor
checking and declaration generation. Product source, schemas, generated
declarations, runtime bundle, manifest, dependencies and diagrams are unchanged.
The [conversion record](2026-09-23-typescript-core.md) owns the earlier runtime
parity and browser observations.

## Corrections

- The [type gate](../../scripts/types/check.ts) now obtains configuration
  diagnostics through TypeScript's public `getConfigFileParsingDiagnostics`
  API. A recovered JSON parse can no longer hide a missing brace or comma.
  Option and program errors remain included; compiler settings stay strict.
- [Declaration inventories](../../scripts/types/declarations.ts) ignore names
  beginning with `.` in both schema and generated-declaration directories.
  Source inventory traversal applies the same rule, so hidden metadata does
  not fail the subsequent coverage gate. Visible unexpected files and missing
  required schemas still fail before artifact writes in both modes.

## Regression evidence

All fixtures are disposable synthetic copies. The
[tooling tests](https://github.com/weirdry/stellar/blob/a7ffe2e6fd64d537c09fc0d50c044d1df062d1d3/test/types-tooling.test.js) snapshot file hashes and
symlink targets before and after checks; they do not follow dangling editor
locks while taking that snapshot.

- Before the fix, the two new tests failed: malformed configuration returned
  success, and hidden metadata caused a schema inventory error.
- Missing closing brace and missing comma now fail with `TS1005` and a
  `tsconfig.json` location. An invalid target still fails; JSONC comments and
  trailing commas still pass. Neither success nor failure writes files.
- `.DS_Store`, AppleDouble-style names, hidden directories and dangling editor
  locks are tolerated by declaration check/build and source coverage. Explicit
  generation remains byte-identical and preserves the metadata.
- With that metadata still present, an extra visible schema, an extra generated
  declaration and a missing required schema fail in both check and build modes,
  without modifying any other file or link. Existing stale/missing declaration,
  excluded-source, leftover-JS and unsafe-code tests remain effective.
- In a separate temporary copy, reverting each correction independently made
  the corresponding test fail: configuration diagnostics, source hidden-entry
  filtering, schema filtering and generated-declaration filtering. All four
  mutations were detected; the real checkout was not mutated by this probe.

## Verification and limits

Local macOS arm64 / Node 24.19.0, against this document's containing change:

- `just --command mise exec --locked -- node --test test/types-tooling.test.js`:
  **5/5** passed. The subsequent source-inventory correction also passed the
  focused hidden-metadata test and the full gate below.
- `just ci`: **93/93 Node tests**, zero failures or skips, including all five
  tooling tests. Documentation, all eight unchanged diagram sets, formatting,
  declaration currency, strict types, lint and bundle currency passed.
- `git diff --check` passed. The runtime bundle, manifest, notices, generated
  declarations, product code and schemas retain their pre-correction bytes.

Hosted CI is separate evidence linked from PR #37 for its submitted head. No
local browser rerun, visual review, actual installer, host discovery, live-source
collection, release or runtime acceptance is claimed for this tooling-only
correction.
