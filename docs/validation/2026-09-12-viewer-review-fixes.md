# Viewer review fixes — 2026-09-12

State: **As-built**

Scope: two defects found in self-review of the unreleased rendering core.
Opposite relation directions overlapped and selected the last painted edge;
target dropdowns collapsed whitespace in implicit option values and lost matches.

## Regression evidence

The new [browser regressions](../../test/browser/regressions.test.js) initially
failed against the prior implementation for both defects. After correction:

- Actual pointer clicks select each directed relation independently in the
  collapsed overview and issue neighborhood, in both source-list orders.
  Inspector pairs and arrow markers retain source direction; fitted neighborhood
  labels do not overlap in the regression scene.
- Target selection distinguishes one-space and two-space names and retains
  surrounding whitespace, tabs, quotes, Unicode, and markup-like text. Dropdown
  and issue-tag selection each produce exactly the expected issue.
- `STELLAR_QA_DIR=outputs/qa-review-fixes just browser-check`: all four browser
  tests passed, including both existing locale suites and the two regressions.
- `just ci`: documentation, formatting, lint, repository checks, and all nine
  Node unit/CLI tests passed.

## Visual review and limits

Reviewed the synthetic reciprocal-relation overview and neighborhood and the
two-space target view. The opposed curves, arrows, and local labels are distinct;
the selected relationship and target results are visible in the inspector.
Screenshots remain in ignored `outputs/qa-review-fixes`.

This is evidence for the reproduced defects, not a general dense-graph layout
or cross-browser guarantee. Source relations, input shape, and classification
content did not change. Only synthetic data runs in public tests and CI. Hosted
CI is reported separately on the PR revision; no package or deployment is released.
