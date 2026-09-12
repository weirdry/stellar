# Source-aware skill validation

Date: 2026-09-12

State: **As-built**

## Scope

Local skill authoring/linking, native Linear/GitHub capture normalization,
multi-source contract and provenance UI. Boundary classification: unreleased —
corrected in place. No previous user input was overwritten or migrated.

## Local executable evidence

- `just ci`: documentation, formatting, lint and Node unit/CLI checks. The suite
  covers source/native uniqueness, alias resolution, repeated repository issue
  numbers, relationship direction/deduplication, unknown context, status mapping,
  malformed input and failure preservation.
- `just browser-check`: Chromium tests on synthetic data in Korean and English,
  including mixed Linear/GitHub headers, colliding identifiers, correct source
  links, cross-repository neighbors, source search/help, counts and phone width.
  Opening the test artifacts made no HTTP(S) requests.
- The skill-creator `quick_validate.py` passed using an isolated temporary Python
  environment with PyYAML 6.0.3. The repository has no Python runtime dependency.
- `just skill-link` linked the checkout into the user's local skill discovery
  directory. This is local setup, not packaged distribution or publication.

Final test counts and revision are recorded in the PR's verification evidence.

## Normalizer review corrections

Synthetic regression checks now cover three corrected behaviors:

- Different explicit native IDs cannot share a display identifier within one
  source. Both Linear and GitHub conflicts are rejected even when the conflicting
  endpoint has no detail record; reversing record order does not bypass rejection.
- UUID-only and identifier-only Linear references resolve through all observed
  native/identifier pairs before graph construction. Reversed records and reference
  arrays produce the same issue identities, context metadata and relationships.
  Full detail captured without a UUID also uses a UUID observed in an endpoint.
- GitHub's explicit `closed/duplicate` reason maps to canonical `duplicate`, with
  its original label preserved. Unknown reasons remain unknown, and `open` remains
  unstarted. Both locale browser tests verify that the assigned duplicate appears
  in the closed filter while canceled context stays outside assigned totals.

After these corrections, `just ci` passed with 19 Node unit/CLI tests and
`just browser-check` passed all 12 Chromium tests. These use invented captures;
live source collection and the earlier private snapshot checks were not repeated
for this follow-up. No viewer styling or layout changed. Hosted CI for the pushed
revision is recorded separately in the PR.

## Independent explicit invocation

An independent agent received only the installed skill entry, the invented mixed
capture, a Korean work-map request and a temporary output directory. It authored
its own taxonomy, normalized 5 issues and 3 relations, classified 4 in-scope
issues, validated, and rendered an HTML artifact. Static inspection verified
embedded input equality, original fact/relationship preservation and distinct
repository identities. It did not use the test classification helper.

This proves explicit use of the linked skill and executable artifact generation;
it does not prove automatic skill selection. The guide contains an observatory
example, so this is not evidence of generalization to an unseen domain. The
independent agent's browser open was blocked by the host URL policy and was not
retried through a workaround. Its interaction/visual review remains unperformed.
It found two stale documentation claims during concurrent implementation; the
README and schema guide were subsequently aligned with the implemented state.

## Live and private checks

A bounded live Linear sample fetched two assigned issues with full description,
individual relations, and paginated child queries. Native normalization yielded
2 assigned issues, 10 unqueried context issues and 10 registered relations.
Agent classification, validation and HTML generation succeeded. Source metadata
explicitly labels this as partial coverage, not the user's complete inventory.
No source issue was changed. Raw captures, derived JSON and reports remain ignored
and local; they are not evidence in public CI.

A separate local regression authored a new input from the pre-existing private
snapshot. All 257 assigned issues, 24 context issues, 675 relations, taxonomy and
prior issue fields were preserved exactly, with source metadata added in a new
file. The new input rendered successfully. Original snapshots, reports and backups
were left untouched. This check does not claim a fresh source inventory.

GitHub REST normalization and mixed-source behavior were tested with invented
records. This run did not perform live GitHub issue collection or establish
endpoint availability for every host/account.

## Visual review and delivery boundaries

Local synthetic Chromium screenshots were inspected for the mixed-source header,
source-qualified identifiers and inspector provenance. Long repeated identifiers
were shortened to repository/issue labels while keeping full provenance available.
Public hosted CI is separate and is recorded against the pushed revision in the
PR. Review, merge, main promotion, publication, automatic discovery and runtime
service acceptance are not implied by local test success. There is no backend,
saved-edit persistence, background sync or distributed package in this change.
