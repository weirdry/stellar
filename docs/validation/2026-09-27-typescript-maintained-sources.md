# Maintained TypeScript source completion

Date: 2026-09-27

Scope: issue #39, the remaining maintained sources after the released core/CLI
conversion. Baseline: `7ad6343b9cab73af183dd202ed2723cc78ae793e` (`dev`).
This record describes local implementation checks, not release or installation
acceptance. [ADR-0009](../decisions/0009-type-maintained-sources.md) and the
[current source guide](../development/typescript-adoption.md) own the decision
and completed inventory.

## Source and artifact ownership

The baseline's 32 maintained JS/Python/shell-logic files are replaced by TS:
viewer; 13 Node-test/fixture files; 7 browser tests; build, diagram and linking
tools; benchmark fixture/preload helpers; lint configuration; four active Python
benchmark/profile scripts; and the documentation checker. Shared checked-value,
DOM, scene/state and profiling helpers have explicit typed owners.

Strict Node, DOM-only viewer and Playwright programs use the same strict options,
with no unsafe `any`, non-null assertions, double assertions or implementation
suppression exceptions. Tests retain corrupt-input probes through unknown
boundaries or deliberate reflective mutation. Locale keys derive from the
existing English catalog; runtime catalog completeness tests still apply.

`assets/viewer/app.js` is now generated from `viewer/`; the renderer still embeds
it in standalone HTML. Both generated JS files and the runner manifest have
read-only drift checks. HTML bytes change with the generated script, while
canonical schemas, core behavior, authored CSS/SVG/catalogs and example inputs
are unchanged. Generated declarations remain owned by JSON Schema.

The six historical JS files and seven Python files in the native/standalone
archives are exact-path inventory exceptions. Their Go/Rust sources, hashes,
receipts and measured datasets are unchanged. Thin setup/check-launch shell and
Git hooks remain shell. Neither an installed skill nor private report was used
or changed.

Generated artifact identity (development version `0.1.3-dev.0`):

| Artifact                    | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `bin/stellar.mjs`           | `8680eae516ba831c917c7e3e963ac58e17d4382fde1445a55143172d1c3d4e41` |
| `assets/viewer/app.js`      | `c058412fe8cd465bc9643c9a6078a5a2b856e7488fb21942a84d568b862af0a0` |
| `bin/stellar.manifest.json` | `416ac7d40b77a7bd7371e529c5afe61f943641a7c46713b866b134a082621733` |

## Local checks

Environment: macOS arm64, repository Node 24.19.0 and frozen development tools.

- `just init`: frozen setup and hooks enabled; no new dependency or lock change.
- `just ci`: documentation, eight diagram sets, formatting, declaration currency,
  strict types, lint, bundle currency and all 98 Node tests passed.
- `just typecheck` and `just lint`: maintained scopes checked, including the TS
  ESLint config loaded through the pinned native-TS flag.
- `just test`: 98/98 Node tests, zero skipped. Added regressions cover viewer
  generation/drift, maintained-source inventory/environment separation and the
  TypeScript documentation checker. Existing installed-layout, malformed-input,
  authority, file-preservation and unsafe-type rejection tests remain active.
- `just browser-check`: 48/48 Chromium tests, zero skipped, including both
  locales, layouts, interaction, source fidelity and SVG export.
- `just benchmark-test`: 5/5, zero skipped. Invalid references/sizes, existing
  output preservation, baseline/reference parity, artifact hash/inventory
  mismatch and non-executing help are checked.
- `just profile-test`: 7/7, zero skipped. CPU/heap attribution conserves totals,
  recursive frames are not double-counted, paths are redacted, and macOS/Linux
  resource samples are normalized correctly. Python-generated shuffle vectors
  preserve operation order across repeated trials and MT19937 block boundaries.
  Retained-artifact resolution rejects traversal and symlink escapes.
- `just standalone-check`: retained source/lock identity, 72 samples, 12
  summaries, 169 differential cases and 22 storage receipts passed.

A size-100, one-trial `just benchmark` smoke run passed four timed output
comparisons and two four-part verification receipts. `just profile` on that
retained stage passed eight CPU/heap output comparisons. Timing values from this
bounded functional check are not performance conclusions. Outputs, logs,
profiles and screenshots remain ignored local artifacts.

The prior renderer and current renderer each ran normalization, first-run
classification, refresh and verification on the same invented capture/choices.
Seven JSON artifacts (draft, maps, states and changes) were byte-identical; all
four checks passed on both reports for both versions. The old and converted
fixture generators also produced identical size-100 synthetic captures.

## Browser and retained-source review

Baseline/head museum reports in Korean and English at 1440×900 and 390×900
had identical initial PNG bytes and diagnostic state; desktop scope/search/theme
observations also matched. This bounded equality is not universal pixel parity.
Rendered desktop Korean and mobile English overviews, English light target view
and Korean mobile relations view were visually inspected for labels, controls,
clipping and relation direction. The new viewer retained those presentations.

A baseline SHA-256 inventory confirmed 94 core/schema/declaration/lock, archived
experiment/dataset and diagram source/artifact files unchanged. No diagram
regeneration was needed; all eight maintained sets retain their recorded bytes.

## Measurement differences

The maintainer approved replacing Python `os.wait4` with `/usr/bin/time`.
Direct-child user + system CPU and maximum RSS remain the measured quantities;
CPU has the system tool's hundredth-second precision (10 ms), and elapsed wall
time includes the wrapper launch. macOS byte RSS and Linux KiB RSS normalize to
MiB. Results record these facts under `measurement`.

The TS harness preserves Python's seeded MT19937/Fisher-Yates trial ordering.
Fixture/tool source identities change, so reference mode requires a fresh
matching baseline. Historical results are not rewritten or mixed with
these observations. Profiling remains separate from uninstrumented command
measurements; there is no timing threshold in CI.

## Acceptance boundaries

A minimal installed-layout regression uses generated JS/resources with no TS,
Python, source tree or development dependencies. It proves runtime independence,
not real installer filtering or host discovery. No main promotion, publication,
installed-skill update, live collection, Firefox/Safari, Windows or native-core
migration was performed. The Linux time parser has synthetic coverage; actual
local resource sampling was on macOS. Hosted CI and development integration are
tracked separately in the PR and issue.
