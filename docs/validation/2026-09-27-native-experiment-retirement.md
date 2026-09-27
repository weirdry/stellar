# Native experiment source retirement

Date: 2026-09-27

Base: `adfba6328196c639bbd6c2160166785cfdabe06b`, the integrated maintained
TypeScript conversion. This cleanup removes completed contributor experiments;
it does not change product behavior or the core-language decision.

## Scope and retained evidence

Removed the 30 tracked files under `scripts/bench/native/` and
`scripts/bench/standalone/`, including six JavaScript and seven Python files,
Go/Rust sources and locks, fixtures, build scripts and local guides. Removed
their five Just recipes, thirteen source-inventory exceptions and two obsolete
formatting exclusions. The active TypeScript benchmark/profile tools remain.

All measured JSON datasets retain their bytes. Dated interpretation and review
records remain; links to removed source now use a fixed historical revision.
Current architecture, source ownership and contributor instructions point to
the [historical reproduction guide](../development/historical-native-experiments.md).

The type-coverage regression inserts JavaScript and Python at two formerly
allowlisted paths. Both must now be rejected without writing, while the two
generated delivery artifacts remain permitted.

## Retention checks

- All 30 removed paths exist at `0fe3abb5bf044812bc63a6519fe188e7c5fefbee`.
  That revision is an ancestor of the released `main` history. The two guides
  have later reproduction notes at the cleanup base; executable sources are
  unchanged between those revisions.
- The standalone read-only checker from that historical revision passed in a
  disposable extraction: source/lock hashes, 72 samples, 12 summaries, 169
  correctness cases and 22 storage receipts. No native code was rebuilt or timed.
- SHA-256 comparison against the cleanup base confirmed unchanged product
  sources, schemas, generated contracts, viewer assets, dependency/tool locks,
  CI workflows and retained data files (excluding explanatory README files).
  All 15 retained JSON evidence files are byte-identical, as are the active
  TypeScript benchmark/profile implementations and their tests.

## Local checks

- `just ci`: **99/99 Node tests passed, zero skipped**, including the expanded
  inventory regression. Documentation, eight diagram sets, formatting, strict
  type coverage, type-aware lint, repository checks and generated viewer/runner
  currency passed.
- `just --summary`: the five retired recipes are absent; `benchmark`,
  `benchmark-test`, `profile` and `profile-test` remain available.
- Source inventory: the only remaining tracked `.js`/`.mjs`/`.cjs`/`.py`
  files are the two generated delivery artifacts. No Python source remains.
- `git diff --check`: passed. Browser behavior and its input contract are
  unchanged; no separate local browser run was required for this cleanup.

## Verification boundary

This is repository maintenance. It does not establish new performance results,
native replay/build success, browser visual review, publication, installation
or runtime acceptance. Historical replay still requires its documented tools
and dependencies; this check does not prove their future availability.
