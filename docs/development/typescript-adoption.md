# TypeScript core and CLI

State: **As-built** for the core, CLI and type tooling described below. Viewer,
existing behavior tests and ordinary contributor tooling remain JavaScript.
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) records the
accepted decision. The [implementation record](../validation/2026-09-23-typescript-core.md)
separates local evidence, hosted checks and release acceptance.

## Baseline and first scope

The conversion's immediate pre-change baseline is
`bb206d77a133498ca8308362b4e7acc40159c75d`, with runner SHA-256
`4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.
The [reviewed plan](https://github.com/weirdry/stellar/blob/bb206d77a133498ca8308362b4e7acc40159c75d/docs/development/typescript-adoption.md)
remains available in Git history. The planning probe's older baseline and native
experiment checkouts below are separate identities.

The complete CLI-to-core path is converted in place. There is no parallel `.js`
source tree or emitted `dist/` tree. Resource URLs retain their directory meaning.

| Included source                                                                                    | Responsibility                                                                            |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [bin/stellar.ts](../../bin/stellar.ts)                                                             | Argument dispatch, lazy loading, exit and error handling                                  |
| `lib/cli-commands.ts`, `lib/cli-help.ts`, `lib/cli-diagnostics.ts`                                 | Arguments, command catalog and safe diagnostics                                           |
| `lib/normalize.ts`, `lib/validate.ts`                                                              | Capture narrowing, normalization, shape and semantic checks                               |
| `lib/continuity.ts`                                                                                | Choices, saved state, identity matching, refresh and fresh-run writes                     |
| `lib/render.ts`, `lib/verify.ts`                                                                   | Validated artifacts, atomic writes and consistency comparisons                            |
| `lib/reading.ts`, `lib/evidence.ts`                                                                | Bounded reading, response retention and filesystem results                                |
| `lib/installation.ts`, `lib/version.ts`                                                            | Resource inventory, doctor results and authoritative version                              |
| [types/generated](../../types/generated/work-map.d.ts), [lib/contracts.ts](../../lib/contracts.ts) | Schema-derived declarations and internal aliases/helpers; no independent wire definitions |
| [scripts/types](../../scripts/types/check.ts), [test/types](../../test/types/contracts.ts)         | Declaration generation, coverage and positive/negative type fixtures                      |

These are the original twelve library modules and CLI, plus the contract helper
and type tooling. [tsconfig.json](../../tsconfig.json) includes every
`bin/**/*.ts`, `lib/**/*.ts`, `types/generated/**/*.d.ts`, `scripts/types/**/*.ts`
and `test/types/**/*.ts` file. The [type gate](../../scripts/types/check.ts)
compares the compiler program with the non-hidden on-disk inventory, including
unimported CLI siblings, and rejects leftover handwritten core/CLI JavaScript.
Discovery ignores hidden editor/OS entries, matching TypeScript's wildcard
discovery; explicitly imported files still undergo compilation. The generated
`bin/stellar.mjs` is the sole exception to that JS rejection.

The viewer, existing JS behavior/browser tests, builder and unrelated tools keep
their current languages. Their source imports and damage-test paths follow the
actual TS owners. Historical native prototypes and measurement receipts remain
unchanged. This is not whole-repository type coverage.

## Contract authority and narrowing

The four JSON schemas remain authoritative. The
[declaration generator](../../scripts/types/declarations.ts) derives one committed
module per schema, resolves local references with HTTP resolution disabled and
checks the exact non-hidden schema and declaration inventories. Names starting
with `.` are ignored in both directories, including OS metadata and dangling
editor locks; visible unexpected files and missing required schemas still fail
before writes in both build and check modes. It generates all candidate
bytes in memory before writing; check mode compares without repair. Generator
options retain unknown native fields, avoid runtime enums and leave array length
constraints to runtime validation. The pinned generator owns declaration
formatting: [Prettier](../../.prettierignore) and style lint exclude generated
files, while the strict compiler checks them with `skipLibCheck: false`.
Handwritten TS remains under repository Prettier and type-aware ESLint.

`lib/contracts.ts` aliases generated roots and derives subtypes through indexed
access. Structurally duplicated `$ref` declarations come from the same schema
invocation. Compile-only fixtures verify that capture sources and saved-state
maps agree with work-map types, and reject invalid version/locale values, missing
required fields, invalid choices alternatives, nullable/optional confusion and
unchecked native fields.

| Input                                                 | Static view after checking                         | Runtime authority                                                                          |
| ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Capture JSON                                          | Typed envelope with unknown-valued native fields   | Capture Ajv checks, provider checks, identity resolution and capture-origin diagnostics    |
| Work-map JSON                                         | Work-map shape; classification remains optional    | Ajv plus references, identity uniqueness, URLs, parent cycles and classification readiness |
| Choices JSON                                          | Generated alternatives and shared taxonomy/targets | Choices Ajv checks and command-owned agent/user authority                                  |
| Saved-state JSON                                      | State shape sharing the work-map definitions       | State Ajv checks, remembered identities, pending reasons and current-map consistency       |
| Other parsed files, exceptions and filesystem results | Unknown until narrowed                             | Manifest checks, safe error extraction, bounded reads and output protections               |

Parsed JSON is bound to `unknown`. Ajv validators use generated types and retain
strict mode, all-errors diagnostics and format validation, without coercion,
default insertion or property removal. Native metadata is narrowed where used;
accepted JavaScript coercions, such as truthy non-string GitHub status reasons,
remain covered by behavior tests. Do not cast an unchecked payload to a provider
interface or tighten its accepted shape to satisfy the compiler.

Generated types approximate JSON Schema. They do not establish URL/date formats,
nonblank strings, unique identities, minimum array lengths or graph references.
Choices contain open intersections, so static assignment does not fully enforce
additional-property rejection; Ajv remains authoritative. A typed draft may lack
classification and is not automatically renderable. Public/file entry points
still validate. `assertWorkMap` returns its checked value and only allows missing
classification when the caller explicitly selects the draft/state boundary;
rendering retains full checks. Internal checked lookups fail at runtime if their
established invariant is violated, rather than using non-null assertions.

## Compiler and lint policy

Exact development pins live in [package.json](../../package.json) and the lock:
TypeScript 6.0.3, Node declarations 24.13.6, typescript-eslint 8.70.0 and
json-schema-to-typescript 16.0.0. Their peer compatibility was checked before
installation. Runtime Ajv, ajv-formats and the esbuild version are unchanged.

The [compiler configuration](../../tsconfig.json) uses NodeNext resolution,
ES2024 output semantics, Node globals, strict checking, checked indexed access,
exact optional properties, unknown caught values, explicit index-signature
access, case consistency and no emit. `ES2025.RegExp` supplies declarations for
the existing Node 24 `RegExp.escape` usage; this does not add a runtime API.
Erasable-only syntax, explicit TS imports and type-only imports keep source
execution compatible with Node's built-in type stripping. No incremental cache,
browser globals, runtime TS loader, enums or emitted intermediate tree is added.
The type gate includes configuration syntax diagnostics as well as option and
program errors. Valid JSONC comments and trailing commas remain supported;
malformed configuration fails without emitting or repairing files.

The actual generator program exposed a transitive declaration error under exact
optional properties. A [locked declaration-only patch](../../patches/README.md)
corrects the parser's generic default without weakening compiler options or
changing dependency runtime code. Review and remove it when upgrading to a
version that passes the strict program unaided.

[ESLint](../../eslint.config.js) enables type-aware rules only for handwritten
owned TS files. It rejects explicit `any`, unsafe use of implicit `any`, non-null
assertions, unchecked double assertions and implementation suppression comments.
Documented `@ts-expect-error` is allowed only in compile-only negative fixtures;
an unused directive fails compilation. A narrow assertion needs its invariant,
reason and behavior evidence; an assertion never substitutes for validation.

## Execution, build and distribution

Contributors use pinned Node 24.19.0 directly for erasable TS, including imports
from existing JavaScript tests and tools. Execution strips types and does not
check them. Installed users continue running `bin/stellar.mjs` with Node 24.x.

[build-runner.js](../../scripts/build-runner.js) uses `bin/stellar.ts`, Node ESM,
target Node 24 and in-memory esbuild generation. It embeds only the product
version from package metadata and includes runtime dependency licenses. Compiler,
linter, generator and generated declarations do not enter the runtime bundle,
notices or resource inventory. esbuild compilation does not establish type
safety; run the separate compiler gate.

The pinned Ajv named constructor and ajv-formats default module's `.default`
plugin satisfy NodeNext declarations and execute in direct Node and esbuild
output. Format validation remains enabled. Help/version still finish before
runtime schema loading, and doctor keeps its fixed resource checks. A minimal
installed-layout test runs without source, types or `node_modules` from an
unrelated working directory. This proves runtime independence, not actual
installer filtering, host discovery or installation acceptance.

## Just, CI and source-path consumers

| Command                  | Behavior                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `just types-build`       | Explicit schema declaration generation                                                                  |
| `just types-check`       | Read-only schema/declaration inventory and byte comparison                                              |
| `just typecheck`         | Strict no-emit compiler plus complete owned-file coverage and leftover-JS detection                     |
| `just lint`              | Existing repository checks plus type-aware TS rules                                                     |
| `just check` / `just ci` | Documentation, diagrams, formatting, declarations, types, lint, bundle currency and Node behavior tests |

Hooks and hosted CI call the same `just ci`. `just init` explicitly performs the
frozen dependency install and applies the locked declaration patch. pnpm's
`verifyDepsBeforeRun: error` makes stale dependencies fail instead of implicitly
installing during a quality command. Correct them with `just init`, then rerun
the check. Formatting, declarations and bundle generation remain explicit writes.
Checks do not repair sources, declarations, lockfiles or delivered artifacts.

Current source links, CLI recipes, builder imports/banner, unit/browser imports
and source-damage tests follow `.ts`. Historical validation links to removed
source use the revision that retained their reviewed implementation. Diagrams
contain no renamed source filenames; their topology and delivered bytes are
unchanged by the language conversion.

Ordinary benchmark/profile commands still use the current bundle, with no timing
gate. Historical native reproduction requires archived checkouts:

- Hybrid staging reads and patches JavaScript source. Use
  `0fe3abb5bf044812bc63a6519fe188e7c5fefbee` with its own frozen setup, as the
  [hybrid guide](../../scripts/bench/native/README.md) specifies. Original measured
  source identities and correction receipts remain separate.
- Standalone replay extracts product baseline
  `77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b` and rejects changed dependency
  manifests. Use the pre-conversion archive checkout specified in its
  [guide](../../scripts/bench/standalone/README.md); current TS dependencies are
  intentionally not a historical replay environment.

Read-only retained-data checks remain usable separately. No native measurements
or measured implementation sources are rewritten to look like the TS core.

## Implementation acceptance

The [dated conversion record](../validation/2026-09-23-typescript-core.md) identifies
the baseline, toolchain and executed comparisons. The
[type-tooling regression suite](../../test/types-tooling.test.js) verifies
unimported/excluded source coverage, leftover JS rejection, declaration checking,
negative fixtures, deterministic generation, drift failures without repair,
unsafe-code lint rejection and generator-owned formatting.

Behavior acceptance also requires existing runtime/CLI/file-safety suites, the
synthetic continuity walkthrough, all four artifact verification comparisons,
byte-identical ordered JSON/state and HTML against the conversion baseline,
user-choice survival, no-write refusal, minimal installed layout and browser
checks. If a rebase changes product code, refresh the immediate baseline and
repeat those comparisons. A compiler pass is not behavioral equivalence.

Published version-1 schemas and durable user files remain unchanged. No schema
bump, compatibility reader, migration, native package or user-state rewrite is
part of adoption. Local checks, hosted CI, dev integration, publication, actual
installation, host discovery and live collection remain separate outcomes.
