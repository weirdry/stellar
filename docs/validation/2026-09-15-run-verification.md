# Run consistency and skill decision review

Date: 2026-09-15

State: **As-built**

## Scope

The read-only `verify-run` command compares a supported native capture, final
map, HTML and optional saved state. The skill now reviews category membership
against outputs and exclusions, keeps collection evidence locally inspectable,
and distinguishes current identity evidence from saved correspondence limits.
Representational text changes still require explicit agent reconsideration;
the runner's text comparison and saved identity behavior are unchanged.

Boundary classification: unreleased — corrected in place. Existing capture,
map and state contracts remain unchanged; no saved user data was rewritten.
Collection performance, concurrency, incremental fetching and alternate lookup
strategies are outside this change.

## Local executable evidence

- `just init` verified locked tools/dependencies and repository hooks without
  changing dependency selectors or locks.
- `just ci` passed, including 47 Node tests, documentation, formatting, lint,
  shell/workflow syntax and Git whitespace checks.
- `just browser-check` passed all 18 synthetic Chromium tests. The initial
  sandboxed attempt could not launch Chromium because macOS denied Mach port
  registration; the same command passed after approved execution permission.
- The skill-creator quick validator accepted the skill. Its PyYAML dependency
  was installed only in a temporary validation environment, not the project.

[Verification tests](../../test/verify.test.js) cover valid-but-altered source
facts, source metadata, missing/extra issues and relations, directed reversal,
HTML data/bundle mismatch, invalid or mismatched state, input roles and read-only
CLI success/failure with spaces and symlinks. Interpretation, locale/view,
unqueried placeholders, optional references and related-edge orientation remain
permitted. Supplied HTML is never executed. Filesystem read failures and mismatch
diagnostics do not echo input text or raw filesystem error paths.

Existing private pilot artifacts were also checked locally with the root
command. Source facts, embedded data, bundled output and saved maps matched;
input file hashes were unchanged. This is artifact consistency evidence, not
approval of the existing classifications. No private data or generated
derivatives are included in this record or public fixtures.

## Independent skill invocation

An independent agent received the skill path, the invented river-station capture
and a short request for an English map with saved classifications. It was not
given the expected taxonomy or implementation tests. It executed `normalize`,
`validate`, `remember`, `render` and `verify-run` through root Just commands in
a separate temporary output directory.

The result contained seven assigned issues, one unclassified unknown context,
three registered relations, three domains and six categories. Boreal experiment
replay and Kestrel bulletin evaluation had separate, purpose-grounded bases;
numerical aggregation and writing explanations of existing aggregates remained
distinct. Deployment cache and credential work shared a delivery-maintenance
category across tools. All new classifications had agent ownership. Inspection
of every rationale and basis found no contradiction with the fixture's outputs
or exclusions; this is one observed invocation, not a general accuracy claim.

The final folder retained a byte-identical capture, map, HTML, state and command
results, with freshness and missing-evidence limits in its README. All four
`verify-run` checks passed and the saved map matched. Browser URL policy blocked
the local file, and the evaluator did not bypass it. This invocation therefore
establishes generation, saved-state creation and artifact consistency; the
separate repository Chromium suite supplies synthetic interaction evidence.

## Evidence boundaries

The verifier does not establish actual collection completeness, semantic
classification quality, prior-state preservation or visual acceptance. These
remain explicit `notChecked` outcomes in its result. A renderer from another
revision may fail exact-output comparison without implying source corruption.

The new [river-station capture](../../examples/purpose-capture.json) is wholly
invented and contains no renamed private issues. Category names and counts are
not fixed expected answers; review authored bases against the supplied purposes.
Hosted CI and clean-checkout results belong to the PR handoff. No live source
collection, source mutation, skill relinking, automatic discovery, package
publication or deployment was performed for this change.
