# Overview independent-review corrections — 2026-09-18

State: **As-built**

Scope: [PR #15](https://github.com/weirdry/stellar/pull/15) and
[issue #14](https://github.com/weirdry/stellar/issues/14), following independent
review of `d6df519` → `b0f5a58`. This record supersedes the placement details in
the [initial validation](2026-09-17-mobile-overview-labels.md), while retaining
that record's observations of the earlier commits. Inputs are the invented
museum example and independently invented rainfall/observation maps.

## Findings and correction

| Finding                                                    | Correction                                                                                                                     | Executable outcome                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1: area names vanish while groups remain                  | Per-line bounds, additional measured vertical clearance and side anchors; two-group phone areas use horizontal group placement | All three museum area names at 390 × 844 and 1024 × 768, and all five invented area names at 1600 × 1000                                               |
| F2: expanded adjacent areas select the wrong issue         | Narrow rows reserve current issue footprints while collapsed, using the same coordinates as expansion                          | Two- and three-group areas with six/sixteen issues per group retain fixed centers and correct visible-dot hit targets after successive tree selections |
| F3: target focus loses names despite free space            | Each text line excludes only its own bounds, including during fit                                                              | All six group names and three area names remain visible in both locales                                                                                |
| F4: single-column source curves cross unrelated nodes/text | Horizontal two-group placement plus bounded, shared-pair curve candidates avoiding rendered obstacles                          | Cross-area museum curves clear unrelated dots/text; opposite arrows remain separate; a within-area arrow clears unrelated dots                         |
| F5: top correction pushes text under the minimap           | Two-sided overhang measurement and actual control rectangles; bounded horizontal shifts can use adjacent free space            | Visible text clears controls at 320 × 568; repeat fit and resize return to the same camera                                                             |

The follow-up also retains the area name in an invented four-group map at
320 × 568 and 667 × 375. Text may still yield in denser scenes; the tree,
accessible names, tooltip and inspector retain full identities. Routing compares
seven candidates with interior samples and does not promise globally optimal
or universally collision-free paths.

## Reproduction and local verification

The initial eight new checks failed against `b0f5a58`: both locales reproduced
missing area/group names, short-phone clearance failures, wrong issue hit targets
and a cross-area arrow through area dots. The final regressions also cover a
larger expansion, text obstruction, reversed arrows and a short four-group map.

- `just ci`: **67/67 Node**, documentation, formatting, lint and repository checks.
- `STELLAR_QA_DIR=<synthetic-output> just browser-check`: **32/32 Chromium**.
- [Layout regressions](../../test/browser/layout.test.js): ten new cases.
- [Overview regressions](../../test/browser/overview.test.js): existing four
  cases retain their six-label fit, accessible identities, click navigation,
  themes, camera and data assertions. Collision checks now inspect actual text
  lines. Manual zoom may preserve more names with the added candidates, so the
  assertion permits all six when they remain readable.
- All 18 earlier browser tests pass, including source fidelity, continuity,
  neighborhood navigation, source/locale handling and SVG export.

Visually inspected the final synthetic Korean/English museum overview, five-area
desktop view, target focus, successive expanded groups, 320 × 568 view, short
four-group landscape view, and the single/opposite/within-area source-arrow
screenshots. Text remains distinguishable in the inspected cases; very short
views retain area names but may omit group names. The within-area crowded example
uses the least-obstructed curve; it clears unrelated dots but can still cross
some text. Full arbitrary-graph edge avoidance is not claimed.

The tests use the repository-pinned Playwright Chromium. No host extension,
live collection, installed-skill changes, private reports, release or deployment
are involved. Hosted CI is reported separately against the pushed revision.
