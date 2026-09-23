# Strict TypeScript core and CLI — 2026-09-23

## Scope and identity

Implements [issue #36](https://github.com/weirdry/stellar/issues/36) and the
[reviewed design](https://github.com/weirdry/stellar/blob/bb206d77a133498ca8308362b4e7acc40159c75d/docs/development/typescript-adoption.md).
The immediate pre-conversion `dev` commit is
`bb206d77a133498ca8308362b4e7acc40159c75d`. Its runner SHA-256 is
`4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.
This is the baseline for behavior parity, separate from the archived native
experiment revisions. The submitted commit and hosted-CI identity are recorded
in the delivery PR; this record describes the implementation and local checks.

All twelve original core modules and the CLI are renamed in place. The additional
contract helper, schema declarations, generator, compiler/inventory gate and type
fixtures are included in the strict program. Existing behavior tests and tools
remain JavaScript with current imports. Schema, viewer, native measured source
and existing diagram bytes are unchanged. The [current guide](../development/typescript-adoption.md)
owns implemented scope and commands; this record does not claim whole-repository
TS coverage.

## Toolchain and justified implementation details

Contributor execution: Node 24.19.0 on macOS arm64, pnpm 11.26.0. Exact dev pins:
TypeScript 6.0.3, Node declarations 24.13.6, typescript-eslint 8.70.0,
json-schema-to-typescript 16.0.0. Peer compatibility was rechecked. Runtime Ajv,
ajv-formats and esbuild versions stay unchanged.

- Strict settings from the plan are active with `skipLibCheck: false`. The
  additional `ES2025.RegExp` declaration library describes the already-used
  Node 24 `RegExp.escape`; no new runtime requirement is introduced.
- Checking the real generator imports exposed a transitive parser declaration
  error missed by the planning probe. A [pnpm declaration patch](../../patches/README.md)
  replaces its invalid expanded generic default with `ParserOptions<S>` itself.
  Runtime code is untouched; no checker option is weakened. The patch and its
  hash are locked with the dependency graph.
- pnpm `verifyDepsBeforeRun: error` prevents the package manager's automatic
  dependency installation during checking. Frozen setup remains explicit.
- `assertWorkMap` returns the structurally and semantically checked value,
  optionally allowing only the existing missing-classification draft case.
  This shares narrowing without an unchecked cast or a second full validation.
  Public renderer/file boundaries still perform their required checks.
- Unknown native metadata retains accepted coercions. The new runtime regression
  covers object/array/boolean/number/null/empty GitHub status reasons, with null
  descriptions and absent completion dates.

## Behavior and artifact comparison

A disposable `git archive` of the full baseline used the same unchanged runtime
dependencies. The current walkthrough's first four shell blocks were replayed
with its `just` invocation mapped to each selected runner; embedded Node scripts
and synthetic choices were unchanged. No live data or source calls were used.
The complete temporary replay and logs remain outside tracked files; the compact
[parity receipt](data/2026-09-23-typescript-parity.json) retains baseline identity,
case count, four execution layouts and all resulting file hashes.

Compared layouts: baseline JS source, baseline installed bundle, current TS
source and current installed bundle. All **19 files per layout** matched exactly,
including ordered draft/map/state/changes JSON, choices, refreshed capture and
the initial/final HTML. This is byte comparison, not merely parsed JSON equality.

Each layout independently passed all four `verify-run` comparisons for both
rendered reports. The refreshed incomplete map still failed validation. The user
classification and target survived source changes. An agent attempt to change
the user's rationale failed and created no output directory. Identical proposals
remain permitted as before; the refusal probe used an actual changed value.

Selected artifact SHA-256 values:

| Artifact         | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------ |
| Initial work map | `ab6d5d121de4a03a32293432b1346228860528114471c4fb44ca658504af5785` |
| Initial HTML     | `cfda77916ec68819374a53e9d799040346dadd44c70b8427cef56db27cb79b68` |
| Final state      | `049e3a455e0092cab72280fc7ae0474a070ac6e9d1dd29095fef7ce7edad71ad` |
| Final HTML       | `8a4e2bb976ec4c41fc604695c24b2b4f1f20d5ccc50980a0d3171d6057832fa0` |

A separate **238-case** in-process baseline/current normalization comparison
matched serialized output or error name/message/diagnostics for every case.
Starting from the synthetic mixed capture, each case changed one field to absent,
null, false, true, 0, 1, empty text, `completed`, other text, an empty object, a
named object, an empty array, one string or two strings. Fields were Linear
`id`, `uuid`, `status`, `statusType`, `priority`, `description`, `project`,
`labels`, `relations`, and GitHub `number`, `node_id`, `state`, `state_reason`,
`labels`, `assignees`, `html_url`, `body`. This finite matrix supplements existing
runtime suites; it does not establish arbitrary-input equivalence by itself.

## Type tooling and local gates

The compile-only contract fixtures verify version/locale unions, required fields,
choices alternatives, shared references, nullable/optional fields and unknown
native data. The executable type-tooling regressions passed these controls:

- An unimported CLI sibling with an error fails compilation; a valid sibling
  passes, but deliberately excluding it from the compiler fails coverage.
- Reintroduced core JavaScript fails inventory checking. An invalid generated
  declaration fails the compiler, and an unused negative directive is rejected.
- Repeated generation is byte-identical. Missing/stale declarations, unexpected
  generated files and added/removed schemas fail without repair. Unexpected
  output inventory also fails explicit generation before writes.
- Lint rejects explicit/implicit unsafe `any`, implementation suppressions,
  non-null assertions and double assertions. Prettier still formats handwritten
  TS while preserving generated declaration bytes exactly.

Executed locally:

- `just ci`: **91/91 Node tests**, zero skipped, plus canonical docs, all eight
  unchanged diagram sets, formatting, declaration currency, strict coverage,
  type-aware lint and bundle currency passed.
- `just browser-check`: **48/48 Chromium tests**, zero skipped. The first attempt
  could not launch Chromium inside the macOS sandbox; the completed run used the
  same pinned browser outside that process restriction. No browser installation
  or viewer change was required.
- A separate export of the complete staged tree, initialized as a temporary Git
  checkout with no `node_modules`, passed frozen `just init` and `just ci`, again
  **91/91** with zero skips. `git diff --exit-code` afterward confirmed no tracked
  file changes. This included applying the locked declaration patch and checking
  regenerated artifact currency under a fresh dependency layout.
- In an isolated dependency-free directory, the locked pnpm configuration made
  `pnpm typecheck` fail with `ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`; no `node_modules`,
  lockfile repair or source output was created. Installation remains explicit.
- `just standalone-check` passed the unchanged historical source/lock hashes,
  72 samples, 12 summaries, 169 cases and 22 storage receipts. This is an archive
  integrity check, not a new native execution or timing result.
- **98 CLI invocations** against the baseline and current bundles matched exit
  status and both streams after replacing only each installation-root path.
  Cases cover global version/help, every command's two help flags, missing
  arguments, mixed help and invalid version arguments. The unrelated working
  directory remained empty. Existing CLI suites separately cover literal
  help-like filenames/searches, quoting, corrupted resources and safe failures.

Current runner: **373,208 bytes**, SHA-256
`9ceec297b2140ca1ba6f3d2e29cfb3bdf0ac9cd0a014ad0c62845a698d608b56`.
Manifest SHA-256:
`9dd81d610f1a699fb0fee9169a023003f20883c3a79cf395df29331b6bcf8ec6`.
Third-party notices are byte-identical to baseline; compiler/generator/linter
packages are absent from the runtime notices and bundle. The bundle bytes may
change with source typing; ordered product artifacts are the parity boundary.

## Historical evidence and limits

Old validation links to renamed source are pinned to the recorded product
revision, or the first commit retaining the reviewed local branding tree
(`7da8d3aca87820a65cab8c107a43205eaf8ad1dc`). Historical observations are not
rewritten as new results. Native guides require a pre-conversion checkout and
its own frozen dependencies; their implementations, locks and measurements are
unchanged. No native timing rerun is used as type-safety evidence.

The local minimal installed-layout test is distinct from running a real skills
installer or proving host discovery. Browser regressions are distinct from a
new perceptual design review. This work does not promote `main`, publish a
release, install a skill, collect live sources, change saved contracts or mutate
user data. Hosted checks, review and `dev` integration are reported separately.
