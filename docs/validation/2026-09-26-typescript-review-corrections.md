# TypeScript independent-review corrections

Date: 2026-09-26

Scope: follow-up to the independent review of PR #37 at
`79176db8bdfec8ed14b9ad284761f9cab635687f`. The conversion baseline remains
`bb206d77a133498ca8308362b4e7acc40159c75d`. This correction changes contributor
lint and source-coverage enforcement, their tests and documentation. Product
code, schemas, declarations, runtime artifacts, dependencies and diagrams are
unchanged.

## Findings and corrections

- **P2, inline directives and alternate assertions:** the previous ESLint
  configuration allowed `eslint-disable` to suppress the ban on `@ts-nocheck`
  and unsafe `any`. Angle-bracket and mixed double assertions also escaped the
  selector for nested `as` expressions. The [TS lint scope](../../eslint.config.js)
  now ignores inline ESLint configuration and requires `as` assertion syntax.
  The existing double-assertion rule remains active. JavaScript lint policy is
  unchanged; `as const` and documented negative type fixtures remain supported.
- **P3, hidden JavaScript shims:** hidden-name discovery correctly ignored
  editor metadata, but also ignored an imported `.shim.js` accompanied by a
  `.shim.d.ts`. The [coverage gate](../../scripts/types/check.ts) now rejects any
  declaration file in the compiler program under `bin/` or `lib/`, using the
  compiler's declaration classification. These directories own TS implementations;
  generated schema declarations and dependency declarations retain their
  separate locations and checks. Hidden metadata remains ignored, and imported
  hidden TS still undergoes normal compilation.

## Regression evidence

The [tooling tests](../../test/types-tooling.test.js) run in disposable synthetic
copies. File hashes and symlink targets are compared around each failing gate.

- Both new regression tests failed before the correction: the suppression
  probe passed lint, and the hidden JS/declaration pair passed coverage.
- Four inline directive cases cover a rule-specific disable around
  `@ts-nocheck`, a blanket disable, a next-line disable and an inline rule-level
  override. All retain the relevant lint errors. Angle-bracket and mixed
  assertions fail the assertion-style rule.
- `as const` and the existing documented `test/types` negative fixtures pass
  lint and compilation. Existing nested-`as`, unsafe-value and suppression
  tests remain in the full suite.
- Imported hidden `.js`/`.d.ts`, `.mjs`/`.d.mts` and `.cjs`/`.d.cts` pairs are
  rejected under both `bin/` and `lib/`, with the declaration path named.
  A visible JS/declaration pair inside a hidden directory is also rejected.
- An imported hidden `.ts` implementation fails for an actual type error and
  passes after correction. Existing metadata tolerance, config syntax,
  declaration determinism and read-only failure tests remain in the suite.
- Removing each new control independently in a separate temporary copy made
  its regression fail: inline-configuration handling, assertion style and
  declaration-shim rejection. All three mutations were detected.

## Verification and limits

Local macOS arm64 / Node 24.19.0, against this document's containing change:

- `just --command mise exec --locked -- node --test test/types-tooling.test.js`:
  **7/7** passed, zero failures or skips.
- `just ci`: **95/95 Node tests**, zero failures or skips. Documentation,
  all eight unchanged diagram sets, formatting, declaration currency, strict
  compilation/coverage, lint and bundle currency passed.
- `git diff --check` passed. Product source, schemas, generated declarations,
  bundle/manifest/notices, dependency configuration, declaration generator and
  diagram artifacts are byte-identical to the reviewed head `79176db`.

Hosted CI is reported separately on the PR for its submitted head.

The earlier [conversion](2026-09-23-typescript-core.md) and
[gate correction](2026-09-23-typescript-gate-review.md) records retain their dated
scope. This follow-up does not rerun the independent reviewer's large runtime
comparison corpus or claim new runtime parity measurements. No local browser
rerun, visual review, native build/replay, actual installation, host discovery,
live collection or release acceptance is claimed.
