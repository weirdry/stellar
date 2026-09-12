# Source review follow-up

Date: 2026-09-13

State: **As-built**

## Scope

Three independent-review findings on PR #2: capture diagnostic locations,
aggregate coverage wording, and localization of unqueried context placeholders.
Boundary classification: unreleased — corrected in place.

## Executable evidence

- `just ci`: 20 Node unit/CLI tests plus documentation, formatting and lint.
  Regression inputs cover invalid full-detail URLs, native GitHub timestamp
  fields, selected unqueried metadata from later alias observations, multiple
  parents and parent cycles. Diagnostics resolve to the supplied capture without
  echoing source text. Failed normalization preserves an existing output and does
  not create an invalid draft. Canonical validation identifies a cycle edge.
- `just browser-check`: 14 Chromium tests on invented data. The new cases cover
  complete, partial and unavailable relation coverage in both locales. The header
  uses a neutral incomplete label; help retains the exact per-source states.
  Captures normalized in one language render unqueried status placeholders in the
  other language. Source labels identical to those placeholders remain literal
  for full-detail issues, and context stays outside assigned counts.

Synthetic screenshots of the affected header and context inspector were inspected
locally in both languages: the header and unqueried status follow the report
locale while the adjacent full-detail source label remains literal. Final revision
and hosted CI outcomes are recorded in the PR handoff. Earlier source-collection, private-snapshot and skill
invocation checks were not repeated for these fixes. No source issues or existing
user reports were changed. Publication, synchronization and saved-edit behavior
remain outside this change.

## Additional capture validation findings

A subsequent independent review identified three more diagnostic failures:
source declarations could be masked by record errors, malformed GitHub metadata
could throw a bare TypeError, and a missing GitHub `html_url` was reported as a
repository mismatch. The normalizer now validates shared metadata before source
indexing, guards supplied assignee/label arrays and elements, and checks required
URLs on full records and relationship endpoints before repository resolution.
It reuses canonical source invariants; the development contract remains version 1.

- `just ci`: **23 Node unit/CLI tests** passed, along with documentation,
  formatting and lint. Regressions cover source errors with otherwise valid,
  malformed and empty record sets; missing and malformed URLs; malformed metadata
  collections/elements; and preservation of supported native metadata forms.
- CLI reproductions for all three findings return capture paths and repair
  guidance without echoing source text. Failures leave an existing output intact
  and do not create a new draft.
- `just browser-check`: **14 Chromium tests** passed on invented inputs. No
  viewer code or layout changed in this follow-up; no new visual inspection or
  live source collection was performed.

Final revision, clean-checkout reproduction and hosted CI outcomes are recorded
in the PR handoff separately from these local results.
