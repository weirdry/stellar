# Rendering core validation — 2026-09-12

State: **As-built**

Scope: the first repository-owned JSON validation, HTML rendering, and bundled
viewer implementation. The artifact is unreleased. The evidence below concerns
local implementation validation; it does not claim a released package or live
source integration.

## Public, reproducible evidence

- `just init`: exact tools and frozen dependencies installed without changing
  selectors/locks; repository hooks enabled.
- `just ci`: canonical documentation, local formatting, JavaScript and shell
  lint, workflow syntax, Git whitespace, and Node unit/CLI tests passed.
- `just browser-install`: the pinned Playwright Chromium was installed explicitly.
- `STELLAR_QA_DIR=outputs/qa just browser-check`: Chromium passed the standalone
  synthetic work-map suite. It covered all assigned example neighborhoods,
  directed edges, known/unknown context, count boundaries, tree selection,
  filters, navigation history, pan/zoom/fit, themes, SVG download/reopen,
  reference/help dialogs, six viewport sizes, mobile drawers, input reuse,
  markup-like text, empty input, and absence of network requests on opening.

The [Node tests](https://github.com/weirdry/stellar/blob/f20a04ec8a2e4e10f44e0a7d8f5ecd0e23ca1e9c/test/core.test.js) cover deterministic rendering,
non-mutation of input, schema/reference/parent invariants, URL safety including
Unicode paths, literal embedding, CLI invocation from another directory,
malformed input, previous-output preservation, and input/symlink protection.

The public inputs are the independently invented museum and seed-library
examples. No anonymized source records, private generated artifacts, or private
regression scripts are used by the public gate.

## Local visual review

Synthetic screenshots were reviewed in dark/light overview and neighborhood
views, target grouping, alternate dataset, and mobile overview/inspector states.
Tree/canvas/inspector styling, labels, arrows, context markers, and drawer
containment were inspected. Small-scene subgroup labels remain visible and
header text truncates safely. Screenshots remain in ignored `outputs/qa`;
they are review evidence rather than pixel-baseline tests.

## Private regression boundary

The original report was read locally without modifying it or its backup.
Issue identities, titles, statuses, assigned classifications and rationale,
target membership, and the complete registered relation list were compared
against a private input prepared in ignored `local/`. The original and new
browser views matched overview topology/positions and representative one-hop
neighborhood topology and counting scope. Unclassified context has no invented
category; its radial ordering may differ from a prototype placeholder.

All private inputs, checks, logs, screenshots, and generated HTML are excluded
from Git and public CI. The conversion used for this local comparison is not
a shipped prototype-format adapter. Review staged filenames and contents
separately before publishing this change.

## Limits

Hosted CI is a separate observation on the PR revision; consult its checks.
This record is not hosted-CI evidence. There is no live Linear collection,
callable installed skill, saved classification editing, refresh merge behavior,
package publication, or deployment. Browser checks use Chromium; they are not
a cross-browser certification or a general graph-layout guarantee.
