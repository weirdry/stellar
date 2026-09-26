# Canonical documentation and diagrams — 2026-09-19

## Scope and source basis

This review updates Stellar's repository-owned arc42 policy and current view,
including the selected Open Star logo, embedded favicon and README banner
boundaries. Work is tracked in [issue #20](https://github.com/weirdry/stellar/issues/20).
The source base is `204f8b734acfd4e1c7b2c6b864ceae17c5c291bd` plus the local
branding and documentation changes. This record describes local evidence; it
does not record a commit, hosted CI run, promotion or release of these changes.

Reviewed implementation owners:

- [Skill workflow](../../SKILL.md), [capture](../../references/capture.md) and
  [normalization](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/lib/normalize.js): host-owned authenticated collection,
  native identity and current facts, separate from agent purpose judgment.
- [Continuity](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/lib/continuity.js) and [contract](../../references/continuity.md):
  user authority, retained absent interpretation, pending review and fresh output;
  best-effort cleanup is not a crash-safe multi-file transaction.
- [Verification](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/lib/verify.js) and [run guide](../../references/runs.md):
  four map-based comparisons, with original HTML read without execution and no
  claim of collection completeness or semantic correctness.
- [Rendering](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/lib/render.js), [viewer assets](../../assets/viewer/README.md)
  and [brand guide](../brand.md): one vector source for header and favicon,
  separate promotional banner, escaped embedding and deterministic bytes.
- [Bundle build](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/scripts/build-runner.js),
  [distribution](../development/distribution.md) and
  [published v0.1.0 evidence](2026-09-19-v0.1.0-release.md): source, integration,
  promotion, publication, installation and invocation are separate boundaries.

The old first-release Open item was removed from the current risk list. Existing
capture, rendering and continuity claims were aligned with implementation.
Unaccepted background synchronization remains Open. Accepted ADRs and older dated
records retain their history. The local profile is `stellar-arc42-v1`; changing a
documentation profile does not change a product wire contract.

## Structural generation and artifact identity

Generator: **Archify 2.17.0-dev.1**. All seven final sources were validated and
atomically delivered with `--quality showcase`: **9/9 checks passed**, zero
composition errors and zero warnings per diagram. The source was frozen before
final delivery. The repository build checked source/HTML identities against each
generator receipt, applied the requested dark default through its two-fallback
presentation adapter, and reran all nine checks on the final HTML. The table
below identifies that final HTML; the manifest also retains each original
generator HTML hash. SVG export uses the final checked artifact.

| Delivered HTML                                                         | Type         | Bytes  | SHA-256                                                            |
| ---------------------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------ |
| [first-report](../architecture/diagrams/first-report.html)             | sequence     | 709445 | `d5d68e146faab82ae0be8413d3515956828e5dc312f70791d1c101b583334e3f` |
| [refresh-continuity](../architecture/diagrams/refresh-continuity.html) | architecture | 706228 | `375bd3c853c23388be8fa9341a6548e8be7e1f4708bf4fcee29c8103bab1d060` |
| [run-output](../architecture/diagrams/run-output.html)                 | lifecycle    | 707755 | `6044010d316c68865ea8bc413067ef18ca307d8fb55da48ee8b058ace3d4fa85` |
| [run-verification](../architecture/diagrams/run-verification.html)     | dataflow     | 711445 | `4a73875ea69d747d31b84705c8276072734bd8e042091fc307abad96959067a7` |
| [skill-delivery](../architecture/diagrams/skill-delivery.html)         | workflow     | 709284 | `56f5f1970e6ef215de96f9d19f653a1b14fa25e3420c62450e91bd932026521e` |
| [system-context](../architecture/diagrams/system-context.html)         | architecture | 707020 | `8bacfc2c88cf52da945ee2add20d03deb570b6ddea535ff1ab77b58cc618454c` |
| [viewer-rendering](../architecture/diagrams/viewer-rendering.html)     | architecture | 705053 | `d76efe1c7a3e2126583c63140d21c99f0a4c3e8fe86c4310ee2789a60dfc33b0` |

The [manifest](../architecture/diagrams/manifest.json) also records each source
and SVG hash. The [guide](../architecture/diagrams/README.md) and
[script](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/scripts/docs/diagrams.mjs) own the regeneration procedure. SVGs
come from these exact HTML files with delivered dark colors resolved, a
background and system font stack added; the topology and authored text are
unchanged. This avoids black shapes in SVG rasterizers lacking CSS variables.

## Semantic review

The seven views were reviewed against the owners above. Source access is confined
to host tools. Classification is authored by the agent, not generated by
`classify-draft`. Refresh preserves explicit user decisions while retaining review
requirements; saved runs may still need classification before rendering. Every
verification comparison uses the same selected map. The diagram now names both
inputs to each comparison, including HTML for embedded-map inspection and the
current runner/assets for byte reproduction. Matched target tags persist even
when an agent classification is withheld for review. The release workflow shows
the tagged path; the owning chapter also explains installation from validated
`main` without a tag. No backend, background worker or migration service is
implied by these views.

## Automated browser evidence

**Passed** for all seven exact HTML hashes above. Archify `visual-check` measured
1440×900, 1600×1000, 1920×1080 and 2048×1320 in the light theme, with additional
light/dark screenshots at 1440×900 and 2048×1320. All final containment, projected
text readability and viewer-control clearance checks passed. The compatible
local Chromium headless-shell executable was selected explicitly through
`ARCHIFY_CHROME`; a previous full-Chrome transport attempt timed out and is not
counted as evidence. Final evidence is bound to the delivered hashes.

Browser receipts and screenshots remain in ignored `outputs/canonical-docs/`.
Automated receipts correctly retain `visualReview: pending`; perceptual review
is recorded separately below.

## Perceptual review

**Passed.** The image-capable reviewer inspected all seven diagrams in the four
endpoint/theme captures and all seven rasterized SVG exports. Labels, arrow
meanings, node fit, contrast, legends and reading order remained visible without
clipping. The main views and necessary cards fit the reviewed desktop screens.
The first-report sequence was compacted without reducing type, and redundant
cards were moved into the owning prose. Verification spacing was compacted to
fit the viewport. An earlier refresh workflow draft was retired after its
bounded collision-repair attempts did not improve; the final architecture view
preserves the three classification outcomes, their conditions and independent
matched-target retention.

This review covers the default READ/Still composition and static Markdown
exports. It is not an exhaustive test of every Archify interaction, export
format, mobile viewport or font environment.

## Repository checks

- `ARCHIFY_ROOT=/path/to/reviewed/archify just diagrams-build`: passed; seven
  matching showcase receipts and reproducible HTML/SVG sets.
- `just ci`: passed, including canonical structure/links, diagram consistency,
  formatting, repository lint, bundle currency and **70/70 Node tests** after the
  self-review corrections.
- Isolated-copy consistency smoke: passed for a clean copy, rejected source,
  HTML and SVG drift, rejected a missing SVG and an orphan SVG, then passed
  after restoration. The actual diagram files were not mutated by this check.
- Browser interaction smoke: search, focus through a result, semantic passport
  opening and closure passed again in all seven **final HTML hashes in the table**
  at 1440×900, with remote font requests blocked. The rerun verifies actual file
  hashes and byte counts against the manifest before opening each file. The older
  pre-dark interaction receipt is historical and does not support the final
  artifacts. This is not an exhaustive Archify interaction suite.
- Product viewer browser regressions were not rerun for this documentation-only
  change. The preceding branding/favicon check in this workspace passed **47/47**;
  this update did not change the viewer implementation further.

Hosted CI, commit/push, release publication and installed-skill updates are
outside this handoff. The existing user reports and previous private runs were
not changed.

## Dark-theme follow-up

The user selected dark SVGs and a dark default for the explorable HTML. All
seven SVGs were regenerated with the delivered dark colors and inspected as
images. The seven final HTML artifacts were rechecked across the same four
viewport sizes and both endpoint themes. A separate browser smoke verified
fresh startup under a light OS, OS color-scheme changes, manual toggling, saved
light choices after reload, and explicit light/dark URL overrides for all seven
artifacts. The fresh default is dark; explicit reader choices remain effective.
At that step, source JSON, diagram meaning, geometry and the installed Archify
skill did not change. The subsequent self-review corrections below update two
diagram sources and supersede their earlier artifact identities.

## Self-review corrections

The inventory gate now discovers every JSON source, accepts digits and underscores
in supported names, and rejects unsupported names explicitly. It excludes only
the manifest and documented Archify browser receipts. The new
[inventory regression](https://github.com/weirdry/stellar/blob/7da8d3aca87820a65cab8c107a43205eaf8ad1dc/test/diagrams.test.js) uses an isolated copy to prove
that unbuilt `report-2.json` and `report_detail.json`, plus unsupported `Report.json`,
fail without changing their inputs or the manifest; a clean/restored copy passes.

The verification view now shows each complete artifact pair with the same work
map, and the refresh view separates classification decisions from retained target
tags. Runtime prose and the continuity guide agree with those views. The diagram
guide now explains local HTML opening and the distinction from GitHub's file page.

Both changed diagrams passed all nine showcase checks with no composition errors
or warnings and were regenerated through the normal build. Their final HTML
passed automated inspection at all four desktop viewports and both endpoint
themes; the image-capable reviewer inspected all eight endpoint/theme captures
and both SVG exports. One refresh candidate overflowed the two smaller viewports;
removing a redundant card sentence resolved it without shrinking diagram text.
The other five diagram hashes are unchanged and retain their existing browser
and perceptual evidence.

Search/focus/passport closure and dark-default/override smoke were rerun across
all seven final HTML files. Local `audit-interaction-review.json` and
`audit-dark-theme-smoke.json` receipts bind each result to the actual final hash
and byte count. Revised-view viewport receipts use `*.audit.visual-check.json`;
all bulky evidence remains in ignored `outputs/canonical-docs/`. The complete
hash table above is the current artifact set; earlier hashes are not transferred
to the revised files. Product viewer behavior and installed skills are unchanged.

The final `just ci` run passed all 70 Node tests, including the new inventory
regression. Hosted CI and integration remain unperformed for this local change.
