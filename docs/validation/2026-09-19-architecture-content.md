# Architecture content follow-up — 2026-09-19

## Scope and source identity

This local follow-up implements the five accepted documentation improvements:
separate stable architecture from viewer details, explain artifacts and terms,
record solution trade-offs, make failure responses actionable, and distinguish
ongoing risks from known limits and undecided extensions. It adds an executable
synthetic continuity walkthrough and one artifact-ownership diagram.

Source: working tree on `dev`, based on
`204f8b734acfd4e1c7b2c6b864ceae17c5c291bd`. Changes are local and uncommitted.
No product implementation, schema shape, accepted ADR or historical validation
record changed in this follow-up. The contract guide's stale development-only
wording was aligned with the recorded v0.1.0 publication; no contract version or
compatibility path was introduced. Earlier branding/canonical changes remain
part of the pending working tree.

## Content and semantic review

- Chapters 08 and 10 now describe stable invariants, user-visible quality
  outcomes, evidence owners and proof limits. Pixel/route details and the browser
  regression map live in the bundled-viewer guide. Existing detailed placement
  rules remain available there.
- Chapter 05 distinguishes capture, draft, choices, current map, private state,
  change summary and HTML. Chapter 12 defines their related concepts. The new
  diagram shows first-generation dependencies and the selected-state continuation
  branch; its owning prose supplies the new-capture/choices input distinction.
- Chapter 04 links current benefits and costs to ADRs 0002–0006 while preserving
  their historical text. A current implementation claim comes from code/tests or
  recorded evidence, not merely an accepted decision.
- Chapter 06 identifies continuation and preservation behavior for partial
  collection, missing classification, uncertain identity, malformed input, output
  failure, renderer mismatch and unavailable response retention.
- Chapter 11 gives trigger, impact, current mitigation and reconsideration
  evidence for actual risk surfaces. Known limits are As-built; possible new
  languages, synchronization and identity/graph extensions remain Open.

Reviewed owners: [normalizer](../../lib/normalize.js),
[continuity](../../lib/continuity.js), [renderer](../../lib/render.js),
[verifier](../../lib/verify.js), [schemas](../../schemas/README.md),
[classification guidance](../../references/classification.md),
[run evidence](../../references/runs.md) and
[continuity guidance](../../references/continuity.md).

The review checked that only the map enters HTML; saved state can be valid while
its map still needs assigned classification; user classification and target
ownership are independent; current facts come from normalization; target-only
edits cannot resolve classification review; absence is not deletion; and exact
HTML verification depends on the selected renderer. The diagram's persistence
branches do not claim an atomic multi-file transaction. No new service,
source writeback, automatic reclassification or state mutation is implied.

## Synthetic walkthrough execution

The shell blocks in [the walkthrough](../../examples/continuity-walkthrough.md),
except the final OS browser-open convenience command, were extracted and run in
order from the repository root. They reused the tracked mixed capture/choices
and created only fresh synthetic temporary output. Each CLI step completed
successfully. Additional read-back assertions established:

- Four assigned issues and one context issue; empty first-run change summary.
- A user category/target correction for `OBS-1`, with both origins recorded.
- Updated source title/status for `OBS-1` while its user interpretation survives.
- Changed full body for `OBS-2` with one `purpose-text-changed` review reason;
  its earlier full evidence remains in memory.
- Validation of the pending map exits **1**, with only the expected
  `missing-classification` diagnostic. It is a saved state, not a complete report.
- Explicit agent classification resolves that review without changing the user's
  fields or either GitHub `#7` record.
- The first and final HTML each pass all four `verify-run` comparisons.

Local receipts are retained in ignored `outputs/canonical-docs/` as
`content-walkthrough.log`, `content-walkthrough-check.json` and their helper
scripts. This is local command/continuity evidence using supplied synthetic
text. It does not measure autonomous classification quality, source collection,
absence/reappearance, live host invocation or browser behavior of that report.

## Diagram generation and identity

[artifact-ownership.json](../architecture/diagrams/artifact-ownership.json) uses
Archify **2.17.0-dev.1**, architecture schema 1, English, still presentation and
`showcase`. Final source validation passes all **9/9** checks with **0 errors and
0 warnings**. The initial candidate's desktop-width diagnostic was resolved by
reducing the viewBox width; no renderer changes or custom route controls were used.

`ARCHIFY_ROOT=/path/to/archify just diagrams-build` delivered all eight sets.
The repository build checked each original receipt, applied its deterministic
dark-default adapter, reran the nine artifact checks, and exported exact dark SVG.
The seven existing final HTML hashes/byte counts match the earlier self-review
receipts; their viewport evidence remains applicable. The
[manifest](../architecture/diagrams/manifest.json) is the complete identity owner.

| New artifact            | Bytes where recorded | SHA-256                                                            |
| ----------------------- | -------------------- | ------------------------------------------------------------------ |
| JSON source             | 3,176                | `57845d4d5ee87911b389c8358d09cf4a9ee7105ee1258a3b8364861774463198` |
| Original generator HTML | —                    | `52666f4be4b6678f392f189aeffb775b264021d8a439d3aefad4f39067868ce4` |
| Final dark-default HTML | 709,989              | `777818269512fcf3419c804913bd2fe3818a25e8addf5b752809e5ddb8dbbddf` |
| Exported dark SVG       | —                    | `03857324e9fee64398a17196feb4263defa8e2cc5a3a61a0332b4bdc7b13a755` |

## Browser and image review

The new final HTML passed Archify `visual-check` in Chromium at **1440×900,
1600×1000, 1920×1080 and 2048×1320**. All measured light-theme viewports had no
horizontal/vertical overflow, readable projected text and no legend/control
intersection. Both endpoint sizes also passed light/dark screenshot checks.
The smallest measured node context was approximately **8.78 CSS pixels**, above
the tool's 6-pixel threshold.

All four endpoint/theme images and a raster preview of the exact exported SVG
were separately inspected. File names, direction, persistence branches and the
state continuation path are legible; lines do not cross unrelated nodes or text,
and the controls remain outside the drawing. The static export retains its dark
background and color meanings. The automated receipt still says
`visualReview: pending`; this paragraph records the separate agent image review,
not a fabricated automated approval or user approval.

Search, focus/passport opening and closure, dark default under a light OS,
OS-theme changes, manual toggle, saved preference and explicit URL overrides
were exercised against **all eight** final HTML files. Each smoke receipt checks
actual HTML hashes and byte counts against the manifest. This is a focused
interaction check, not every Archify control or export format.

Ignored evidence: `artifact-ownership.content.visual-check.json`, screenshots
under `content-browser/`, `artifact-ownership.content.svg.png`,
`content-interaction-review.json` and `content-dark-theme-smoke.json`, all under
`outputs/canonical-docs/`. The original seven-view evidence remains in the
[earlier record](2026-09-19-canonical-documentation.md).

## Repository checks and limits

`just ci` passed: canonical documentation, all **8** source/HTML/SVG sets,
formatting, repository syntax/lint, generated runner currency and **70/70** Node
tests. The log is retained as `outputs/canonical-docs/content-ci.log`. A separate
read-only check resolved **30** local Markdown heading links in the edited
content. No product test or fixture was added for this documentation follow-up.

No product browser suite was rerun for this documentation-only follow-up;
previous product-browser observations retain their original scope. No commit,
push, hosted CI, integration, publication, installed-skill update or live source
validation is claimed. No remote hosting/advisory audit was performed. Real user
captures and their derivatives were not used.

## Content-review corrections

The subsequent source review identified two overbroad architecture statements.
Chapter 05 now limits the classification prerequisite to assigned issues and
links the empty/context-only first-run path: validate and render directly, or
use `remember` first when continuation state is needed. Chapter 08 now limits
automatic label collision/owning-node/control-clearance checks to the global
view; neighborhood layout does not run those placement checks.

The review reproduced validation, in-memory rendering and state initialization
for empty and context-only captures using the existing synthetic mixed-source
fixture; empty choices correctly failed. Label placement scope was checked
against `placeNodeLabels` and its call site in the viewer. These are prose
corrections; the diagram's main path is now explicitly scoped to assigned work
requiring classification. Diagram bytes, schemas and product behavior are
unchanged, so existing browser/image evidence retains its scope.

After these corrections, `just ci` passed again with **70/70** Node tests and
all **8** diagram sets. The local log is
`outputs/canonical-docs/content-corrections-ci.log`. No new browser run was needed
for these prose-only scope corrections.
