# TypeScript source ownership

State: **As-built** for maintained core, CLI, viewer, tests and development tools.
Generated JavaScript and frozen native experiment sources remain explicit exceptions.
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) records the
accepted decision. The [implementation record](../validation/2026-09-23-typescript-core.md)
records the first conversion. The [completion record](../validation/2026-09-27-typescript-maintained-sources.md)
records the remaining-source conversion and its validation boundaries.

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

The remaining-source conversion starts at `7ad6343b9cab73af183dd202ed2723cc78ae793e`.
All maintained behavior code now uses TypeScript:

| Source                                                                               | Ownership and execution                                                                            |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| [viewer/](../../viewer/app.ts)                                                       | Schema-derived input, separate display models, typed state/scene and DOM/SVG; bundled for browsers |
| [test/](../../test/core.test.ts), [test/browser/](../../test/browser/viewer.test.ts) | Node and Playwright behavior tests; checked JSON/fixture and DOM boundaries                        |
| [scripts/](../../scripts/build-runner.ts)                                            | Build, linking, docs/diagrams, benchmark/profile and type tooling; direct Node TS                  |
| [ESLint configuration](../../eslint.config.ts)                                       | Typed configuration loaded through Node's native TS support                                        |

[tsconfig.json](../../tsconfig.json) checks Node sources and generated contracts;
[tsconfig.viewer.json](../../tsconfig.viewer.json) gives the viewer DOM globals
without Node globals; [tsconfig.browser-tests.json](../../tsconfig.browser-tests.json)
checks Playwright's Node runner and serialized page callbacks with both libraries.
All extend the same strict options. Browser callbacks cannot close over Node
helpers: assertions used inside them are defined inside the serialized callback.

The [type gate](../../scripts/types/check.ts) compares all compiler programs with
the non-hidden inventory, including unimported sources and root configuration.
It rejects maintained JS/Python and declaration shims in implementation folders.
Hidden OS/editor entries are ignored during discovery; imported hidden code and
its declarations remain checked. The only generated JS exceptions are
`bin/stellar.mjs` and `assets/viewer/app.js`. Exact historical JS/Python paths
under `scripts/bench/native/` and `scripts/bench/standalone/` are allowlisted,
not entire directories. Their Go/Rust sources, receipts and datasets remain frozen.
Shell entry points for setup, hooks and repository orchestration remain shell;
canonical documentation validation now runs in TypeScript.

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
browser globals in the Node program, runtime TS loader, enums or emitted intermediate tree is added.
The type gate includes configuration syntax diagnostics as well as option and
program errors. Valid JSONC comments and trailing commas remain supported;
malformed configuration fails without emitting or repairing files.

The actual generator program exposed a transitive declaration error under exact
optional properties. A [locked declaration-only patch](../../patches/README.md)
corrects the parser's generic default without weakening compiler options or
changing dependency runtime code. Review and remove it when upgrading to a
version that passes the strict program unaided.

[ESLint](../../eslint.config.ts) enables type-aware rules only for handwritten
owned TS files. It rejects explicit `any`, unsafe use of implicit `any`, non-null
assertions, unchecked double assertions and implementation suppression comments.
Inline ESLint configuration is ignored in this TS scope, so source comments
cannot disable these rules. Type assertions use `as` syntax; angle-bracket and
mixed assertion syntax cannot bypass the double-assertion rule. `as const`
remains allowed.
Documented `@ts-expect-error` is allowed only in compile-only negative fixtures;
an unused directive fails compilation. A narrow assertion needs its invariant,
reason and behavior evidence; an assertion never substitutes for validation.

## Execution, build and distribution

Contributors use pinned Node 24.19.0 directly for erasable TS, including tests and ordinary tools. Execution strips types and does not
check them. Installed users continue running `bin/stellar.mjs` with Node 24.x.

[build-runner.ts](../../scripts/build-runner.ts) uses `bin/stellar.ts`, Node ESM,
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

The [viewer builder](../../scripts/build-viewer.ts) bundles `viewer/app.ts` into
the committed `assets/viewer/app.js` as an ES2022 browser IIFE with no external
imports. The renderer still embeds that file, CSS, SVG and catalogs into standalone
HTML. `just build-runner` builds the viewer before recording resource hashes;
`just bundle-check` checks viewer currency before runner/manifest currency.
Both check modes compare in memory and never repair artifacts. Generated JS is
excluded from handwritten lint/formatting. HTML bytes change with the generated
script, so old reports retain their original renderer identity; schemas and saved
state formats do not change. Input map bytes, locale catalogs and visual algorithms
remain owned by their existing contracts.

ESLint's TS configuration uses `--flag unstable_native_nodejs_ts_config` with
the pinned Node version; no runtime loader or new installed dependency is needed.

## Just, CI and source-path consumers

| Command                  | Behavior                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `just types-build`       | Explicit schema declaration generation                                                                  |
| `just types-check`       | Read-only schema/declaration inventory and byte comparison                                              |
| `just typecheck`         | Strict no-emit compiler plus complete owned-file coverage and maintained JS/Python detection            |
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

Ordinary benchmark/profile commands now use direct Node TS with the current
bundle and system time accounting, with no timing gate. The [performance guide](performance.md)
records CPU precision, RSS units, wrapper overhead and preserved Python shuffle ordering. Historical native reproduction requires archived checkouts:

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
[type-tooling regression suite](../../test/types-tooling.test.ts) verifies
unimported/excluded source coverage, leftover JS rejection, declaration checking,
negative fixtures, deterministic generation, drift failures without repair,
unsafe-code lint rejection and generator-owned formatting.

Behavior acceptance also requires existing runtime/CLI/file-safety suites, the
synthetic continuity walkthrough, all four artifact verification comparisons,
byte-identical ordered JSON/state against the conversion baseline, current
source/bundle HTML equality and browser behavior parity,
user-choice survival, no-write refusal, minimal installed layout and browser
checks. If a rebase changes product code, refresh the immediate baseline and
repeat those comparisons. A compiler pass is not behavioral equivalence.

Published version-1 schemas and durable user files remain unchanged. No schema
bump, compatibility reader, migration, native package or user-state rewrite is
part of adoption. Local checks, hosted CI, dev integration, publication, actual
installation, host discovery and live collection remain separate outcomes.
