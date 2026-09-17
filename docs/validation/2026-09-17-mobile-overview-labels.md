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

Observed local results:

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

## Limits

This is a bounded regression for small overviews with long labels. It is not a
general graph optimizer, a guarantee that every dense scene shows every label,
or proof across all browsers and fonts. Existing neighborhood, relation-selection,
filter and navigation regressions remain applicable. No live collection, private
report rewrite, skill installation, package publication or deployment is performed.
