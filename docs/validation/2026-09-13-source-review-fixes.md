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
