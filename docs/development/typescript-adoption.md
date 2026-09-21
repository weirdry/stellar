# TypeScript adoption plan

State: **Target**. The Node runtime and bundled JavaScript delivery remain the
accepted direction. The implementation design below is proposed for review in
[issue #33](https://github.com/weirdry/stellar/issues/33) and
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md).
This planning change does not convert source, add dependencies or activate checks.

## Baseline and first scope

The reviewed baseline is `0fe3abb5bf044812bc63a6519fe188e7c5fefbee`.
[package.json](../../package.json), [Justfile](../../justfile),
[the builder](../../scripts/build-runner.js) and
[the source CLI](../../bin/stellar.js) currently execute JavaScript with Node
24.19.0 contributor tooling and a Node 24.x installed-runtime prerequisite.
There is no TypeScript compiler or type-checking gate in this baseline.

Convert the complete CLI-to-core path together. Checking only schemas or the
entry point would leave the data transformations outside the promised boundary.
The first implementation includes these owners, renamed in place to `.ts`:

| Included source                                                    | Responsibility to type                                                                         |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `bin/stellar.js`                                                   | Argument dispatch, lazy loading, process exit and error handling                               |
| `lib/cli-commands.js`, `lib/cli-help.js`, `lib/cli-diagnostics.js` | Command arguments, usage metadata, safe diagnostics                                            |
| `lib/normalize.js`, `lib/validate.js`                              | Capture narrowing, normalization, shape and semantic validation                                |
| `lib/continuity.js`                                                | Choices, saved state, identity matching, refresh and fresh-run writes                          |
| `lib/render.js`, `lib/verify.js`                                   | Validated artifact generation, atomic writes and consistency comparisons                       |
| `lib/reading.js`, `lib/evidence.js`                                | Bounded reading, response retention and filesystem results                                     |
| `lib/installation.js`, `lib/version.js`                            | Resource inventory, doctor results and authoritative version                                   |
| New `types/generated/*.d.ts`, `lib/contracts.ts`                   | Schema-derived declarations and internal aliases/results, with no independent wire definitions |
| New `scripts/types/*.ts`, `test/types/*.ts`                        | Declaration generation/checking and positive/negative type fixtures                            |

These are 12 existing `lib` modules and one CLI entry, plus the new type tooling.
Keep the source directory layout so resource URLs relative to `import.meta.url`
retain their meaning. Do not keep parallel `.js` copies or a second `dist/` source
tree. The generated `bin/stellar.mjs` remains the installed entry point.

| Explicitly outside the first type-checking boundary                   | Required treatment in the same implementation                                                                                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets/viewer/app.js`, HTML/CSS and locale catalogs                  | Remain browser JavaScript and data; preserve the report contract and run existing browser tests. Viewer typing is deferred, not claimed complete.                        |
| Existing Node/browser tests and `test/fixtures.js`                    | Remain JavaScript behavior tests; update source imports, CLI paths and source-damage fixtures to the actual `.ts` owners. New type fixtures cover the compiler boundary. |
| `scripts/build-runner.js`, other existing JS/MJS/Python/shell tooling | Remain in their current languages. Update imports, entry point, generated banner and diagnostic paths that name renamed source; retain existing lint/tests.              |
| Native comparison implementations and retained experiment data        | Remain historical research. Do not rewrite measured implementations, timings or receipts to resemble a TS implementation. See the archive treatment below.               |

Declare all `bin/**/*.ts`, `lib/**/*.ts`, `types/generated/**/*.d.ts`,
`scripts/types/**/*.ts` and `test/types/**/*.ts` as the compiler scope. Review
`tsc --listFilesOnly` against the on-disk inventory of those owned paths. Fail
the type gate if any first-party `.ts` or `.d.ts` file is absent from the compiler
program, including an unimported CLI sibling, or if a handwritten JS module
remains or reappears under the core/CLI ownership boundary. Keep the generated
`bin/stellar.mjs` outside source coverage. Third-party JavaScript still uses its
package declarations. `allowJs: false` alone does not prove that the intended
source files were converted or included.

## Contract authority and narrowing

Keep the four JSON schemas authoritative. Generate committed declarations with
the pinned `json-schema-to-typescript` development dependency, resolving local
references from `schemas/` with HTTP resolution disabled. Use `unknownAny: true`,
`ignoreMinAndMaxItems: true` and `enableConstEnums: false`. Supply a deterministic
generated-file banner without a blanket lint-disable comment. Do not put `tsType`
overrides into schemas or maintain a second handwritten copy of their shapes.
The generator options and limitations are documented by its
[maintainer](https://github.com/bcherny/json-schema-to-typescript).

The pinned generator owns declaration formatting. In the implementation, add
`/types/generated/` to `.prettierignore`; both `just format` and
`just format-check` must leave that generated directory alone. Keep handwritten
TS files under the repository's normal Prettier rules. Do not run a second
formatter over generated declarations: `types-build` writes the generator's
bytes and `types-check` compares those same bytes. This avoids conflicting
generator and repository Prettier defaults. The exclusion does not disable
declaration drift detection or compiler checking. No ignore rule is added by
this planning PR.

Generate each schema into its own declaration module. Alias the exported root
types in `lib/contracts.ts`; derive subtypes through indexed access rather than
copying fields. Shared `$ref` declarations may be structurally duplicated by the
generator, but all come from the same schema files in the same invocation. Check
that capture sources and saved-state maps are assignable to their work-map
counterparts. Generation must be deterministic and detect additions/removals in
the four-schema inventory instead of silently skipping a new contract.

| Untrusted boundary                                           | Static view after the appropriate check                                           | Runtime authority retained                                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Capture JSON                                                 | Capture envelope; native `data` and relation objects retain unknown-valued fields | Capture Ajv validation, provider-specific field checks, source identity resolution and capture-origin diagnostics in `normalize`        |
| Work-map JSON                                                | Work-map shape, with optional classification still optional                       | Work-map Ajv validation plus semantic references, identity uniqueness, URL safety, parent-cycle and classification checks in `validate` |
| Choices JSON                                                 | Generated alternatives and shared taxonomy/target shapes                          | Choices Ajv validation and agent/user authority in `continuity`; origin remains command-owned                                           |
| Saved-state JSON                                             | State shape referencing the same work-map definitions                             | State Ajv validation, remembered identities, review reasons, current-map consistency and retained user ownership in `continuity`        |
| Other parsed files, caught exceptions and filesystem results | `unknown` until checked; explicit internal result types thereafter                | Existing manifest checks, safe error extraction, read limits, permissions, exclusive creation and atomic replacement                    |

Immediately bind `JSON.parse` results to `unknown`. Use Ajv validators parameterized
with generated types for structural narrowing, and preserve semantic validation
after that narrowing. [Ajv's TypeScript guide](https://ajv.js.org/guide/typescript.html)
describes these guards; supplying a generic type does not itself prove that a
schema and type agree. The generation check and contract fixtures provide that
alignment evidence. Keep `strict`/`allErrors` and format validation as today;
do not add coercion, defaults or removal of additional properties.

The capture schema intentionally does not specify every provider-native field.
Check fields where consumed, preserving currently accepted normalization and
coercion behavior. Do not cast the entire raw payload to a provider interface or
tighten the accepted input contract just to satisfy the compiler. Internal
provider views may describe already-checked fields; they are not new input schemas.

Generated types approximate JSON Schema: they cannot establish URL/date formats,
nonblank strings, uniqueness, graph references or semantic readiness. With the
selected array option, minimum lengths also remain runtime checks. The choices
`anyOf` declarations contain open intersections, so static assignment does not
fully enforce `additionalProperties: false`; Ajv remains authoritative for extra
fields. TypeScript structural assignment is not an exact-object validator.

Distinguish a shape-valid normalization draft from a renderable map. The draft
may lack assigned classifications; a TypeScript `WorkMap` annotation must not
authorize rendering or bypass pending-review checks. Keep full validation at
public/file entry points, even for typed callers. Define diagnostic/result types
for internal control flow without changing serialized CLI results. An assertion
function must actually run its checks before narrowing; a type assertion alone
cannot certify runtime input.

## Compiler and lint policy

The proposed initial pins are TypeScript **6.0.3**, `@types/node` **24.13.6**,
`typescript-eslint` **8.70.0** and `json-schema-to-typescript` **16.0.0** as exact
development dependencies. Keep Ajv 8.20.0, ajv-formats 3.0.1 and esbuild 0.28.2
unless implementation uncovers a separate justified need. On the planning date,
typescript-eslint 8.70.0 accepts TypeScript `>=4.8.4 <6.1.0`; the latest 7.0.2
compiler is outside that range. Recheck peer compatibility before locking the
implementation; do not select an unsupported compiler simply because it is latest.
The [planning observations](../validation/2026-09-21-typescript-plan.md) record the
specific probe and its limits. No dependencies are added by this plan.

Proposed `tsconfig.json` settings, not an active configuration:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useUnknownInCatchVariables": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": false,
    "noEmit": true,
    "allowJs": false,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true
  },
  "include": [
    "bin/**/*.ts",
    "lib/**/*.ts",
    "types/generated/**/*.d.ts",
    "scripts/types/**/*.ts",
    "test/types/**/*.ts"
  ]
}
```

Use [TypeScript's option definitions](https://www.typescriptlang.org/tsconfig/)
as the compiler reference. Keep browser globals out of the core program, avoid
incremental output files in the read-only gate, and do not weaken strictness per
module to finish the conversion. Narrow optional lookups and caught values at
their use sites; preserve absent versus null versus explicitly supplied values.

Extend ESLint with [type-aware rules](https://typescript-eslint.io/getting-started/typed-linting/)
only for the declared TS scope, retaining current JS/browser configuration.
Enforce no explicit `any`, no unsafe assignment/access/call/return from implicit
`any`, and no non-null assertions in handwritten implementation. Do not accept
`@ts-ignore`, `@ts-nocheck`, double assertions or casts of unchecked input as
coverage. A necessary narrow assertion needs its invariant, reason and behavioral
test reviewed at that line; it is not a substitute for input validation.
Allow documented `@ts-expect-error` only for intentional negative type fixtures,
where an unused directive must fail. Exclude generated declarations from style
lint explicitly and from Prettier as specified above, but include them in
compiler checking with `skipLibCheck: false`.

## Execution, build and distribution

Contributors continue using Node 24.19.0 directly for erasable `.ts` source,
with explicit `.ts` relative imports and `import type` for declarations. Existing
JavaScript tests/build scripts can load those modules using Node. No `tsx` loader,
emitted intermediate tree, enum, parameter property, runtime namespace or path
alias is required. Node's [type-stripping documentation](https://nodejs.org/docs/latest-v24.x/api/typescript.html)
explains that execution does not type-check or apply `tsconfig` transformations.
Source execution is a contributor detail; installed users still run `.mjs`.

Change the esbuild entry to `bin/stellar.ts`, retaining `platform: node`, ESM,
`target: node24`, in-memory generation and Node-built-in-only external imports.
[esbuild removes types without checking them](https://esbuild.github.io/content-types/#typescript),
so bundle success cannot substitute for `tsc`. Preserve lazy loading for help,
version and doctor. Type-only imports must not pull validators/resources into
their fast paths. Keep the root package-version projection and dependency-license
collection; development compiler/generator/linter packages must not enter the
installed bundle or its notices as runtime dependencies.

The temporary probe identified CommonJS declaration interop to handle explicitly:
the pinned Ajv exposes a typed named `Ajv` constructor; the pinned ajv-formats
default import is typed as a module under NodeNext and its `.default` member is
the callable plugin. The latter was checked in direct Node and esbuild output.
Recheck this with full format-validation tests during implementation instead of
casting the imports to `any` or replacing format validation.

Keep `bin/stellar.mjs`, its integrity manifest and the schema/viewer runtime
inventory. Generated declarations and TS tooling are not runtime resources.
Regenerate the runner, manifest and notices explicitly after the source change;
the new runner's bytes need not equal the old JavaScript build. Installation
continues to require only the delivered runner/resources and Node 24.x, with no
compiler, project dependencies or OS/CPU-specific Stellar executable.
The existing installer may copy contributor source too; runtime independence is
proved by the minimal installed-layout test, not by assuming a packaging filter.

## Just, CI and source-path consumers

The following commands are proposed additions, not available commands today:

| Proposed command/change  | Observable behavior                                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `just types-build`       | Explicitly generate declarations from schemas with pinned tools; the generator owns their formatting                                                                  |
| `just types-check`       | Generate in memory, compare inventory and bytes; fail on drift without repairing anything                                                                             |
| `just typecheck`         | Compare all owned TS/declaration files against the compiler program, reject leftover core/CLI JS, and run `tsc --noEmit` including type fixtures; no emitted JS/cache |
| `just check` / `just ci` | Add declaration currency and type checking to existing documentation, diagram, format, lint, bundle and Node checks                                                   |

Continue running the same `just ci` through hooks and the existing CI job after
frozen `just init`; no separate per-module pipeline is necessary. Type-aware lint
stays in `just lint`. Explicit `just build-runner` remains generation, and
`just bundle-check` remains an in-memory comparison. Both validate the runtime
resource inventory before writes as today. A build without the complete CI gate
does not establish type safety. Type-checking failures must not repair schemas,
declarations, the bundle or lockfiles.

Update source CLI recipes and the package `stellar` script, builder imports and
banner, dynamic imports, unit/browser imports and CLI-spawning fixtures. In
particular, distribution and diagnostics tests edit copied source files to
simulate failures; update those paths and retain their assertions. Verify tests
execute `.ts` owners instead of stale emitted `.js`. Update current source links
in canonical/development/contract documentation. Preserve historical dated
records as observations of their recorded revisions; replace links to removed
source paths with commit-pinned links to each record's actual revision, without
rewriting its observations. Update diagram source labels/owner references if
they name renamed files, following the normal diagram policy.

Keep optional ordinary benchmark/profile commands pointed at the actual bundled
CLI; language adoption does not introduce a timing gate. The hybrid stager reads
`lib/normalize.js`, patches a source anchor and compiles `bin/stellar.js` from its
checkout. For historical hybrid reproduction, pin the archive checkout to
`0fe3abb5bf044812bc63a6519fe188e7c5fefbee`, which retains the reviewed JavaScript
stager and product source. The [experiment correction record](../validation/2026-09-21-native-review-corrections.md)
distinguishes its corrected staging procedure from the original measured source
identities; retain those original receipts. This historical checkout is not the
baseline for a later TypeScript conversion, and does not claim to reproduce
that future conversion's immediate predecessor. Do not adapt the archived
implementation or rewrite its measurements for the source-language change.

The standalone replay already extracts pinned
`77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b` source and rejects changed dependency
manifests: use the archived PR checkout, as its guide requires, once TS dev
dependencies change. Update both experiment guides and the performance guide to
make these checkout requirements explicit; do not claim native replay on the
converted checkout. Read-only archive-data checks remain separate.

## Implementation acceptance

One coherent core/CLI conversion is the next implementation unit after plan
review; this planning issue does not authorize or claim that conversion. Work
from the then-current `dev`, recheck the inventory/pins, generate declarations,
convert source and callers, then integrate the read-only checks and documentation
in the same reviewable change. Do not merge intermediate unchecked copies as
completed type coverage.

Record the full pre-change `dev` commit and its runner hash as the baseline for
the conversion's JS-to-TS behavior comparison. Refresh that baseline and repeat
the comparison if the implementation is rebased onto changed product code.
Use that recorded revision for artifact/behavior parity, independently of the
fixed historical experiment checkouts above.

| Required evidence for that implementation                        | Existing owner or planned check                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete, strict core/CLI program with no unchecked source files | Compare all owned TS/declaration files with the compiler file list, including an unimported CLI sibling; reject leftover core/CLI JS; type-aware lint and `just typecheck` must pass                                                                                                                                                    |
| Types follow schema authority                                    | Regeneration is byte-identical; a schema/declaration mismatch fails `types-check` without writes; repository formatting leaves generated bytes unchanged while still checking handwritten TS; fixtures check version/locale unions, required fields, choices alternatives, shared refs, nullable/optional fields and raw unknown values |
| Same accepted/rejected inputs and diagnostics                    | Existing normalization, core, continuity-diagnostics and CLI suites; malformed JSON, invalid schema and semantically invalid maps still fail at runtime; do not relax tests to accommodate TS                                                                                                                                           |
| Same command boundary                                            | Source and bundled version/help/doctor/workflows retain exit codes, output streams, literal help-like path/query arguments, lazy loading and safe error summaries; source locations may reflect the renamed files                                                                                                                       |
| Same user-visible vertical path                                  | Synthetic normalize → classify-draft → revise → refresh → classify/reject → render → verify-run; all four comparisons pass, user fields survive and refused agent overwrite writes nothing                                                                                                                                              |
| Same artifact and file safety                                    | Compare ordered JSON/state and HTML against the conversion's recorded pre-change commit; retain atomic replacement, input-alias refusal, occupied-run refusal, owner-only permissions and no-write failure tests                                                                                                                        |
| Same dependency-free runtime                                     | Minimal installed-layout test without source/types/node_modules, from an unrelated cwd; regenerate artifacts then pass `bundle-check`, doctor damage cases and all existing distribution tests                                                                                                                                          |
| Existing viewer behavior preserved                               | `just browser-check` on synthetic data even though viewer source stays JS; no visual redesign is included                                                                                                                                                                                                                               |
| Checks remain read-only and reproducible                         | Frozen install, `just ci`, explicit browser gate and clean tracked-file state afterward; type-only edits do not pull compiler tooling into runtime resources                                                                                                                                                                            |

Update the development command guide, distribution guide, schema authority note
and architecture chapters 4, 5, 8, 9 and 10 with executable owners and actual
coverage when implementation lands. Promote only the completed core/CLI scope
to As-built; keep deferred viewer/tooling/test typing visible. Product README
and skill commands need no new user syntax for this source-language change.
Update contributor references if they name a renamed source path.

Work-map/state version 1 have already been distributed. This plan preserves
those JSON contracts and durable files; no schema bump, dual reader, migration,
installer change or user-state rewriting is part of adoption. If implementation
finds a real behavioral defect, report it separately rather than concealing a
contract change in the type conversion. Local checks, hosted CI, dev integration,
release, actual installation, discovery and live collection remain distinct.
