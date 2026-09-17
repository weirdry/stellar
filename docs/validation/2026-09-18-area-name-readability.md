# Area-name readability and framing guidance — 2026-09-18

State: **As-built**

Scope: [PR #15](https://github.com/weirdry/stellar/pull/15),
[issue #14](https://github.com/weirdry/stellar/issues/14), following independent
review of `c5de306`. This extends the [previous usability record](2026-09-18-overview-usability.md)
without replacing its revision-specific results. All inputs are invented.

## Correction and retained behavior

- X1: the fixed two-line area-name limit cut off distinguishing endings even
  on a wide desktop. Area names now balance their width and line count with the
  stage: up to three lines on a wide grid, four on the middle grid, and two on a
  narrow stage. If the longer form cannot be placed, its compact two-line form
  is tried under the same collision and owning-dot checks. Measurement remains
  batched; temporary measurement nodes are removed before display/export.
- X2: automatic framing retains the existing minimum readable scale. The F
  control now says "Reframe for readability" / "읽기 좋은 크기로 보기". Its tooltip,
  overview hint and help explicitly say that some areas may remain off-screen
  and explain how to explore them. No whole-map-fit mode or camera change is
  introduced.

The compact fallback matters in short landscape and crowded maps: retaining
additional text must not remove every area name. Names that exceed the selected
capacity still truncate, and names without a clear placement can still hide.
Full names remain available in the tree, accessible name, tooltip and inspector.
Source data, relationships, classification, group positions and camera rules are
unchanged. Manual panning can still move text behind controls; large-scene
performance is not a frame-time guarantee.

## Executable and visual verification

- `just ci`: documentation, formatting, lint and 67/67 Node tests passed.
- `STELLAR_QA_DIR=<synthetic-directory> just browser-check`: 43/43 pinned Chromium
  tests passed. The existing 40 tests remain in the suite.
- Two new locale cases check all six full area names at 1600 × 1000 and
  1024 × 768, including phone-to-wide resizing, owning-dot association, text
  clearance and the framing notice in the tooltip/help. The English fixture
  differs only in its ending number, so merely showing six identical truncated
  labels cannot pass.
- In an isolated `c5de306` snapshot with those two tests added, 40/42 passed:
  the English case failed on truncated text, and the Korean case failed on the
  missing framing notice. The snapshot's viewer and locale files were unchanged.
- A third new case checks compact fallback in a 568 × 320 single-area map,
  a 1024 × 768 four-area/144-issue map, and a 740 × 360 mixed-group map. Each
  retains an area name with clear text and no leftover measurement nodes.
- An additional local sweep covered 352 initial views (16 synthetic datasets ×
  22 viewports). It found no text/text, text/dot, text/control, off-stage text
  or dot/dot overlaps, no view without an area name, and no page errors or
  external requests. This scratch-harness observation complements the committed
  regression tests; it is not an additional CI gate.
- Screenshots inspected: six long English names at desktop and tablet widths,
  six long Korean names at desktop width, and compact fallback on crowded and
  short stages. The root browser command above can regenerate these synthetic
  screenshots.

Hosted CI must be reported separately against the pushed revision. No live
collection, skill installation, release, deployment, real touch-device,
WebKit/Firefox or screen-reader validation is claimed.

## Performance observation

A local comparative sample used the same invented expanded maps at `c5de306`
and this follow-up, averaging three Fit calls and five zoom steps. For 402 nodes
and 688 edges, Fit/zoom measured 62/68 ms versus 67/77 ms at width 390, and
46/52 ms versus 56/65 ms at width 1600. The 116-node cases stayed below 10 ms.
These desktop-CPU samples show additional layout cost, not a performance win
or a CI threshold. They do not establish real-phone timing or remove the
existing large-scene performance limitation.
