# TypeScript planning observations

Date: 2026-09-21

Scope: documentation and a temporary tool-feasibility probe for
[issue #33](https://github.com/weirdry/stellar/issues/33).
Source baseline: `0fe3abb5bf044812bc63a6519fe188e7c5fefbee`.
The [adoption plan](../development/typescript-adoption.md) remains Target;
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) is Proposed.
The later [review correction record](2026-09-21-typescript-plan-review.md)
checks generated formatting, compiler-file coverage and baseline attribution;
the original feasibility observations below are retained.

## Source inspection

Inspected the CLI entry, all core module boundaries, four schemas, contributor
commands, builder, package/lock configuration, CI, source-importing tests and
native experiment staging/replay. The baseline has 12 `lib/*.js` modules and one
source CLI entry, no TS compiler/configuration, and a generated JavaScript runner.
Runtime schema/semantic validation and the installed resource inventory already
exist; source typing would supplement them.

The hybrid stager reads and patches current JavaScript source. The standalone
replay extracts a pinned historical baseline but requires unchanged package/lock
manifests. These are different reproduction constraints; neither should silently
be reported as replayed against a future TS checkout.

## Temporary feasibility probe

Installed exact development-only probe dependencies into a fresh temporary
directory with lifecycle scripts disabled and a separate temporary npm cache.
The repository's package files, dependencies and product source were not changed.
Used Node 24.19.0 on macOS arm64, TypeScript 6.0.3,
`json-schema-to-typescript` 16.0.0 and `@types/node` 24.13.6. Ajv 8.20.0,
ajv-formats 3.0.1 and esbuild 0.28.2 were the repository's installed versions.

The published package metadata for
[typescript-eslint 8.70.0](https://registry.npmjs.org/typescript-eslint/8.70.0)
declares TypeScript `>=4.8.4 <6.1.0` and ESLint 10 compatibility. The registry's
latest TypeScript was 7.0.2, outside that range. This motivated the proposed
6.0.3 pin; a complete repository typed-lint installation was not performed.

| Probe                                                      | Observed result and limit                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compileFromFile` for capture, work-map, choices and state | All four resolved local `$ref`/`$defs` with HTTP resolution disabled. Options were `unknownAny: true`, `ignoreMinAndMaxItems: true`, `enableConstEnums: false`; two generations matched exactly for each schema.                                                          |
| Generated declarations                                     | No `any` token in declaration code. Capture-native fields stayed unknown-valued. Choices retained required alternatives but emitted open intersections; types do not enforce every additional-property or value constraint.                                               |
| Strict `tsc --noEmit` using the plan's compiler options    | Passed for the generated declarations and small probe files. Shared capture sources and state maps assigned to work-map subtypes. This was not a check of Stellar's unconverted core.                                                                                     |
| Nine intentional negative assignments                      | Wrong version/locale, empty choices, missing choice operation, missing map fields, explicitly undefined optional field, unchecked raw title, unchecked array lookup and nullable field all produced the expected errors; no unused `@ts-expect-error`.                    |
| Direct Node execution                                      | A `.ts` smoke program loaded the unchanged work-map schema, validated the synthetic museum fixture with Ajv/formats, narrowed the unknown input and rejected an empty object.                                                                                             |
| CommonJS/ESM declarations                                  | Calling the default ajv-formats import directly failed TS2349 under NodeNext. Its `.default` member was callable in both the declarations and pinned runtime; the named `Ajv` constructor and that plugin member passed compilation and execution without an import cast. |
| esbuild ESM bundle of the smoke program                    | Passed using `platform: node`, `target: node24`, `bundle: true`, `write: false`; direct execution produced the same smoke result. Only `node:fs` and `node:assert/strict` remained external. This was not a replacement Stellar bundle.                                   |

To repeat the generator observation, install the exact probe dependencies in a
disposable directory, invoke `compileFromFile` on each unchanged schema path with
the options above, compare a second generation and include the resulting `.d.ts`
files in a strict no-emit program. The generated root names are
`StellarHostCapture`, `StellarWorkMap`, `StellarClassificationChoices` and
`StellarSavedClassificationState`. The implementation must commit its own
reproducible generator and type fixtures; these small feasibility observations
do not constitute a maintained conversion test suite.

## Boundaries

No full-core conversion, compiler coverage of existing Stellar source, typed
ESLint run, source/bundle differential replay, native rerun, browser/visual
review, installation, publication or live collection was performed by this
probe. The limited compiler/runtime observations support the proposed approach;
the implementation acceptance table owns the work needed to prove the real
conversion. Repository quality-gate results for this documentation change belong
to its PR and hosted CI record.
