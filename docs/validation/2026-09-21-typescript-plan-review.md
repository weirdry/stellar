# TypeScript plan review corrections

Date: 2026-09-21

Scope: the P2 formatting conflict and two P3 coverage/baseline findings from
independent review of [PR #35](https://github.com/weirdry/stellar/pull/35) at
`ce6755cf8f8a5d7dedc8c8ed90fdd6f8066fc135`, tracking
[issue #33](https://github.com/weirdry/stellar/issues/33).
The [adoption plan](../development/typescript-adoption.md) remains Target and
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) remains Proposed.

## Plan corrections

- The pinned declaration generator owns generated formatting. The implementation
  must exclude `/types/generated/` from repository Prettier while retaining
  generation byte checks and compiler checking. Handwritten TS remains formatted
  normally. This documentation correction does not add an active ignore rule.
- The proposed compiler scope includes `bin/**/*.ts`. The type gate must compare
  every first-party TS/declaration file in the owned paths against the compiler
  program, including unimported CLI siblings, and reject leftover handwritten
  core/CLI JavaScript. A passing compiler alone does not prove complete coverage.
- Historical experiment checkouts are distinct from the future conversion's
  behavior baseline. Hybrid reproduction uses the fixed reviewed JS checkout
  `0fe3abb5bf044812bc63a6519fe188e7c5fefbee`; original measured source identities
  and receipts remain unchanged. The conversion must record the actual pre-change
  `dev` SHA and runner hash and refresh its parity comparison if a rebase changes
  product code. No future immediate-parent identity is claimed for the archive.

## Focused disposable checks

Copied the four unchanged schemas and repository Prettier settings into a new
temporary directory. Reused the exact dependencies from the original planning
probe without modifying them: Node 24.19.0 on macOS arm64, TypeScript 6.0.3,
`json-schema-to-typescript` 16.0.0 and `@types/node` 24.13.6. Formatting used the
repository's Prettier 3.9.6. No probe file or dependency was added to the repository.

Generation used `compileFromFile` with the plan's options, HTTP resolution disabled
and the deterministic banner `// Generated from canonical schemas; do not edit.`.
Two generations matched for each schema. The checks below used temporary
Prettier/TypeScript configurations, not implemented Stellar type commands.

| Check                                               | Observed result                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository Prettier without the proposed exclusion  | `--check types/generated/*.d.ts` exited 1: capture, work-map and state declarations conflicted with repository formatting.                                                                                                                                  |
| Prettier with `/types/generated/` excluded          | The generated-file check exited 0. An unformatted handwritten `lib/control.ts` still exited 1. Explicit `--write` fixed that control and preserved all four generated SHA-256 values; the subsequent formatting check and generator byte comparison passed. |
| Drift despite the formatting exclusion              | Appending a comment to one declaration made the generator byte comparison exit 1 without changing any generated file. Explicit regeneration restored the original bytes.                                                                                    |
| Unimported CLI sibling with the old literal include | `bin/lazy-entry.ts` contained `export const value: string = 1;`. With only `bin/stellar.ts` included, the sibling was absent from `--listFilesOnly` and the compiler exited 0.                                                                              |
| Unimported CLI sibling with `bin/**/*.ts`           | The sibling appeared in the compiler program and `tsc --noEmit` exited 2 with TS2322. Correcting the fixture made the full proposed configuration pass, including the generated declarations.                                                               |
| Separate inventory control                          | All seven owned probe files appeared in the revised compiler program. Deliberately excluding the valid sibling let compilation pass, but comparing the on-disk inventory with the compiler list identified that missing file.                               |

The fixed hybrid checkout contains the corrected stager with SHA-256
`91d2f73c63e62ba65bf3f1496cb34894b2f69ca0df34d2958b9513b399ae76d7`, matching
the [native review correction record](2026-09-21-native-review-corrections.md).
The retained raw measurements remain SHA-256
`0e220c18689d98869294b87cbbc062b2193e17976533444158d1fecc7484648e`.
This verifies the referenced source/record identity, not a new native replay or
timing run. The standalone experiment's pinned baseline is unchanged.

## Boundaries

The probes demonstrate the corrected plan's formatting and coverage requirements;
they do not establish a working Stellar TS conversion, maintained type gate,
typed-lint integration or JS-to-TS behavior parity. No product source, schema,
dependency manifest, compiler configuration, ignore rule, generated artifact,
workflow or diagram changed. No native rerun, local browser/visual check, actual
installation, live collection or release was performed. Repository checks and
hosted CI for the final correction commit are recorded separately in PR #35.
