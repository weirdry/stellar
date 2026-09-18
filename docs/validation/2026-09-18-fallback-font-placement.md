# 2026-09-18 fallback-font area placement

State: **As-built**

## Failure and cause

At `24a7917`, [hosted Ubuntu CI](https://github.com/weirdry/stellar/actions/runs/35287628184)
passed 67 Node tests but only 39/43 Chromium tests. The missing names affected
an English six-area middle grid, a five-area desktop and two short four-group
views. The prior macOS 43/43 result did not establish fallback-font behavior.

The unmodified suite reproduced the same four failures in an isolated Ubuntu
24.04 ARM64 Playwright container (`mcr.microsoft.com/playwright:v1.63.0-noble`,
image digest `sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`).
Changing only the synthetic page's font to Arial also reproduced all four
failures on macOS. In the container, `fc-match Arial` resolves to Liberation
Sans. Wider measured text exhausted the finite placement candidates; earlier
area names could also occupy an edge area's only available space. No source
facts or issue counts were involved.

## Correction

Within equal selection/focus priority, edge-constrained area names place first.
Area side candidates exhaust the outward direction before occupying a neighbor's
space. Additional candidates try a five-pixel side gap and 16/32-pixel horizontal
shifts above/below the dot. The existing four-pixel collision margin, nearest-own-
dot requirement, stage/control checks, font size, wrapping and node positions
remain intact. This is a bounded placement correction, not a new layout engine
or a platform-specific font override.

Four explicit Arial/sans-serif regressions require retained names, full wider-
stage endings, clear labels, owning-dot association, unchanged embedded input and
repeatable framing. Existing default-font requirements are unchanged. All four
new tests fail against the `24a7917` viewer in an isolated synthetic test copy.

## Local verification

- `just ci`: 67/67 Node tests; documentation, formatting and lint pass.
- `just browser-check`: 47/47 Chromium tests on macOS.
- Ubuntu container: the same browser suite, `node --test test/browser/*.test.js`,
  passes 47/47 with the pinned Playwright 1.63.0 Chromium. The container supplies
  Node 24.20.0; it is additional Linux evidence, not the locked hosted gate.
- Inspected Linux screenshots at 1024 × 768, 1600 × 1000, 568 × 320 and
  667 × 375. The wider fixtures retain all area names and their distinguishing
  endings. Short views retain the compact area name with no text/control overlap.
- One exploratory container run had a page-initialization timeout while files
  were being formatted. The subsequent complete run on stable files passed;
  the timeout is not counted as a successful run or an independently diagnosed
  product defect.

All fixtures are invented. Screenshots and exploratory logs remain local and
ignored; no source collection, private report, skill installation, release or
deployment is part of this correction. The required hosted result for the final
commit is recorded in [issue #14](https://github.com/weirdry/stellar/issues/14)
after pushing; local/container success does not imply hosted success.

Word-boundary wrapping, compact-name disambiguation and further large-map
performance work remain in [issue #16](https://github.com/weirdry/stellar/issues/16).
The new candidates do not guarantee visibility for arbitrary maps or fonts.
