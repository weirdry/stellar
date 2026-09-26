# Independent review follow-up — 2026-09-12

State: **As-built**

Scope: browser control, search, scope presentation, naming, and narrow-screen
relation readability fixes following independent review of the rendering core.
The input schema and source relationship meanings are unchanged.

## Observed behavior

- Browser modifier shortcuts leave the camera and default action alone. Plain
  fit/search controls still work. Empty or dismissed search results cannot be
  selected with Enter, and repeated node selection adds no redundant history.
- Search finds assigned and context issues by ID or title. Context remains
  outside totals; filtered assigned work has a separate label in search,
  relationship rows, tooltips, inspector tags, and neighborhood captions.
- Context tags shared by assigned work activate the matching target overlay.
  Context-only targets are descriptive tags with an explanation and cannot
  create a filter absent from the dropdown.
- Header and exported SVG titles retain authored owner whitespace and literal
  markup-like characters in both languages. Korean normalized status controls
  are translated while source status labels remain unchanged.
- Four parallel relations retain independent pointer targets in a fitted
  390-pixel neighborhood. Visible relation text avoids node identities and other
  labels; crowded text is suppressed, then returns on zoom. Selecting any edge
  still reveals its original source pair and relationship meaning.
- The duplicate legend now has its own muted dashed sample. The existing
  owner-only HTML output permissions are documented, with no permission change.

## Local verification

The six additional [browser regressions](https://github.com/weirdry/stellar/blob/98b93060f7ba59dfd9970c7eb376dd5f38d36c06/test/browser/regressions.test.js)
each failed against the prior viewer for the reproduced defects. After correction:

- `just ci`: documentation, formatting, JavaScript/repository checks, and all
  nine Node unit/CLI tests passed.
- `STELLAR_QA_DIR=outputs/qa-independent-review just browser-check`: all ten
  Chromium tests passed. These include both original locale suites, the two
  previous relation/target regressions, and six new review regressions.
- Actual pointer tests selected all four parallel relations at phone width;
  inspector pairs matched input. Both languages passed scope, target, owner-name,
  search, and narrow-screen checks without page errors.

## Visual evidence and limits

Synthetic phone relation views were inspected in dark and light themes, along
with the context inspector and its descriptive/shared targets. Optional screenshots
remain in ignored `outputs/qa-independent-review`; no private input or derivative
was added to public fixtures or validation output.

This establishes the exercised Chromium behavior, not general graph-layout,
cross-browser, touch-gesture, or accessibility acceptance. The viewer still uses
a two-level taxonomy and one-hop neighborhoods. Hosted CI belongs to its exact
PR revision and is reported separately; no merge, publication, or deployment is
established by these local results.
