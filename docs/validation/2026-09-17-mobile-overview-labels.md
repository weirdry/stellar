# Mobile overview label readability — 2026-09-17

State: **As-built**

Scope: [issue #14](https://github.com/weirdry/stellar/issues/14), a bundled-viewer
fix developed from `d6df519f77d50643b5755176332310ebb88124ec`. The public
reproduction uses invented museum data: two areas, four long purpose-group names,
five assigned issues, and registered source relations. No private report, source
text, or screenshot is included in the change.

## Reproduction and correction

At 390 × 844 CSS pixels, both Korean and English versions reproduced overlapping
domain/category labels in the original fitted overview. The new browser tests
failed on the measured text/node rectangles; the 18 pre-existing Chromium tests
passed. A page-overflow check alone would not identify these collisions.

The correction uses one compact domain column on narrow stages, leaves room
above the phone minimap, and places global labels below or above their own nodes
using measured text bounds. Crowded text can yield to higher-priority names;
zoom and selection reconsider it. Panning does not relocate nodes or labels
relative to one another. Source facts, taxonomy, counts, graph identities and
relation directions are unchanged.

## Verification

The [overview regressions](../../test/browser/overview.test.js) cover both locales:

- All six names remain visible in the fitted synthetic phone overview. Label
  rectangles clear other labels and dots; individual text lines stay inside the
  stage and clear the caption, minimap and controls, in dark and light themes.
- Zooming out hides crowded names without changing nodes or relations. Fitting
  restores all six; panning translates the existing placement consistently.
- Actual node clicks select each area/group. Accessible names, hover tooltips,
  the mobile inspector and tree retain full names, including truncated labels.
- Desktop resize and return to phone retain readable labels and restore the
  original phone layout. Embedded source/classification data remains unchanged.
- Page errors and external HTTP(S) requests are absent.

Observed local results at `3e63931`:

- `just ci`: passed documentation, formatting, repository/JavaScript lint and
  all **67/67** Node unit/CLI tests.
- `STELLAR_QA_DIR=<local-synthetic-output> just browser-check`: passed **20/20**
  Chromium tests, including the two new locale cases and all 18 existing cases.
- Visually inspected before/after synthetic phone screenshots, corrected
  Korean/English phone views in dark and light themes, and desktop views. Area
  and group names are distinct in the corrected fixture; the lower text clears
  the minimap. Also inspected existing synthetic neighborhood/relation views.
  Screenshots remain local and can be regenerated with `STELLAR_QA_DIR`.

Hosted CI belongs to the PR's exact revision and is reported separately. The
local browser gate used the repository-pinned Playwright Chromium, not a host
browser extension or a live report.

## Caption-clearance follow-up

Self-review of `3e63931` reproduced a new caption collision at 390 × 667 with
three synthetic coastal-observation areas and two groups per area. The English
area title began at y=121.62 while the fixed caption spanned y=119–133.39. The
previous candidate test only considered nodes and already placed labels.

The follow-up measures the fitted text. When an upward label intrudes into the
caption/navigation clearance, one additional fit reserves its maximum upper
extent. It includes hidden labels in the measurement, because a new scale can
reveal them, and excludes nodes outside the requested fit. The original margins
are recalculated on every fit; panning does not trigger the correction.

The new English regression fails against `3e63931` on actual caption overlap;
a Korean companion covers the same topology. Both check fixed UI clearance,
visible area-name retention on the short phone, repeated fit, a height round
trip, unchanged nodes/relations/counts, and relative label positions during pan.
The shared occlusion check now includes the entire navigation and camera toolbar.

Follow-up local results:

- `just ci`: passed, **67/67 Node** tests.
- `just browser-check`: passed, **22/22 Chromium** tests, including both new
  short-phone cases and the 20 existing cases.
- Inspected the corrected Korean and English 390 × 667 screenshots. The area
  names remain visible below the caption, and lower text clears the controls.
- A supplemental base/follow-up comparison of 32 invented phone configurations
  (both locales, one to three areas, one to four groups per area, two heights)
  reduced the observed fixed-UI occlusions from one to zero. No visible-label
  intersections were found in the corrected outputs. This bounded comparison
  is local evidence, not an arbitrary-layout guarantee.

## Subsequent independent review

Independent review at `b0f5a58` found area-name loss, expanded-node selection
collisions, target-view label suppression, cross-area arrow interference, and
short-phone minimap occlusion beyond these fixtures. The local results above
remain observations of those revisions, not evidence that these regressions
were absent. See the [follow-up record](2026-09-18-overview-review-fixes.md) for
the corrected policy and regression evidence.

## Limits

This is a bounded regression for small overviews with long labels. It is not a
general graph optimizer, a guarantee that every dense scene shows every label,
or proof across all browsers and fonts. Existing neighborhood, relation-selection,
filter and navigation regressions remain applicable. No live collection, private
report rewrite, skill installation, package publication or deployment is performed.
