# Initial classification application — September 17, 2026

## Scope

The follow-up to [issue #8](https://github.com/weirdry/stellar/issues/8), tracked
in [issue #11](https://github.com/weirdry/stellar/issues/11), adds a first-draft
application path. The agent still authors interpretation. Optional automatic
suggestions remain separate in [issue #10](https://github.com/weirdry/stellar/issues/10).
No viewer, source schema, dependency lock or saved-state version was changed.

Boundary classification: unreleased — corrected in place.

## Initial implementation checks — cf675f3

These results apply to [cf675f3](https://github.com/weirdry/stellar/commit/cf675f302bc4befd8df8ac4ff1715cc302c784ce).

- `just init`: locked tools and dependencies available; repository hooks ready.
- `just ci`: documentation, format, repository/shell/workflow checks, ESLint,
  and **66/66 Node tests** passed.
- `just browser-check`: **18/18 Chromium tests** passed. The first restricted
  execution could not launch Chromium because of a macOS process permission
  error; the unchanged pinned suite passed with approved execution permissions.
- The skill-creator `quick_validate.py` check passed. Its PyYAML dependency was
  installed in an isolated temporary environment because the available Python
  environments did not provide it; repository dependencies were unchanged.

[First-run tests](../../test/classify-draft.test.js) exercise the tracked
[capture](../../examples/mixed-capture.json) and
[choices](../../examples/mixed-choices.json) together. They verify source-fact
preservation, repository-local identifier collisions, target application,
unclassified context, matching saved state, and later refresh/user revision.
Negative cases cover missing assignments, invalid facts and choices, attempted
source/origin writes, protected user choices, taxonomy redefinition, malformed
JSON, relative references, occupied outputs and symlinks. CLI checks confirm
input preservation, private output permissions, error roles and exit statuses.

## Initial skill exercise — cf675f3

The author explicitly applied the updated Stellar skill in this session using
only [purpose-capture.json](../../examples/purpose-capture.json), with artifacts
in a fresh temporary directory outside the checkout:

1. Normalize an unchanged capture copy into a draft.
2. Inspect metadata and each body's structural index, then read the short source
   blocks through root Just commands.
3. Author choices for seven assigned issues. Separate calibration, replay
   tooling, language evaluation, numerical production and bulletin publication;
   combine the two delivery-maintenance tasks. Leave the unqueried context alone.
4. Apply choices with `classify-draft`, without a custom map-application script
   or extra `remember` command.
5. Validate, render and verify the result with its saved state: `captureFacts`,
   `embeddedMap`, `bundledViewer` and `stateMap` all passed.
6. Refresh that state against the same capture: no pending classifications,
   added/updated/not-observed issues or reviews.

The result contained seven assigned issues, one unqueried context, three
registered relations, three domains and six categories. Membership was checked
against the short bodies' outcomes and exclusions. This taxonomy is an example
interpretation, not a required answer or an automatic semantic guarantee.

## Self-review corrections — 132fa37

The corrections and local results below apply to
[132fa37](https://github.com/weirdry/stellar/commit/132fa375bd4189d88bc836f10572458c445a131e).

The follow-up corrects first-run repair guidance and two reader-guide examples:

- Missing first-run classifications now identify the draft issue with
  `input: "work-map"`. The repair explains canonical `issueId`, category and
  rationale in choices, with origin assigned by the runner. A new CLI regression
  reverses draft and choices order, confirms refusal before directory creation,
  follows that pointer to repair choices without origin, and checks successful
  state creation and unchanged source facts. Standalone map-validation guidance
  still requires origin. Source-text probes remain absent from diagnostics.
- Search items are documented with their actual four fields: `block`, `offset`,
  `preview` and `previewTruncated`. Excerpt `start`/`end` belong to `read-issue`.
- The documented pipelines enable `set -euo pipefail`. Executing both examples
  under Bash and Zsh succeeded with valid synthetic inputs; a missing map or
  issue selector exited 1 and stopped before the subsequent command in both
  shells. The positive search also checked the returned item fields.

Local `just ci` passed **67/67 Node tests** and the skill validator passed.
A fresh synthetic root-Just exercise confirmed incomplete-choice refusal,
successful repair, validation, rendering, and all four `verify-run` checks.
The local Chromium suite was not repeated for this diagnostic/documentation-only
follow-up; the earlier **18/18** result above applies to the initial change.
Exact-head hosted CI remains recorded in the PR.

## Evidence limits

This was a same-session explicit workflow exercise, not independent forward
testing, fresh-session automatic skill discovery, installation or live collection.
No private pilot artifacts or source systems were used or modified. No manual
visual review of the newly generated report was performed; the Chromium suite
is separate interaction-regression evidence. Hosted CI and merge status belong
to the delivery PR, not these local results. No token or latency savings are claimed.
