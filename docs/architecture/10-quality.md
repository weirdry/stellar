# 10. Quality

State: **As-built**

| Scenario                                                      | Expected behavior                                                                             | Evidence owner                                                     |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Render different owners and classifications                   | Same viewer works without source edits                                                        | [Synthetic examples](../../examples/README.md), core/browser tests |
| Render either supported locale under another browser language | Owner-derived name and fixed UI follow input locale; source facts stay unchanged              | Core/browser tests and locale catalogs                             |
| Invalid identities, categories or endpoints                   | Field-specific diagnostic and repair; no report replacement                                   | [Core tests](../../test/core.test.js)                              |
| Select an issue or expand a group                             | Source-backed neighbors, direction and synchronized selection                                 | [Browser tests](../../test/browser/viewer.test.js)                 |
| Opposite relations connect the same visible nodes             | Each relation can be selected independently in the reviewed overview and neighborhood         | [Browser regressions](../../test/browser/regressions.test.js)      |
| Target names differ only in whitespace                        | Dropdown and tag selection match the exact authored target                                    | [Browser regressions](../../test/browser/regressions.test.js)      |
| Use browser shortcuts or reopen a cleared search              | Browser defaults and camera remain independent; Enter selects only visible results            | [Browser regressions](../../test/browser/regressions.test.js)      |
| Search context or inspect filtered assigned work              | Both remain searchable, labels distinguish their scope, and assigned counts are preserved     | [Browser regressions](../../test/browser/regressions.test.js)      |
| Select a target from a context issue                          | Shared targets select assigned work; context-only tags cannot activate an overlay             | [Browser regressions](../../test/browser/regressions.test.js)      |
| Revisit the selected node or use an owner with whitespace     | No redundant history entry; header and SVG retain the literal owner name                      | [Browser regressions](../../test/browser/regressions.test.js)      |
| Fit four parallel relations in a phone neighborhood           | Visible relation labels do not overlap; each source relation remains independently selectable | [Browser regressions](../../test/browser/regressions.test.js)      |
| Include context or unknown detail                             | Context remains outside totals; status stays unknown                                          | Validator and browser tests                                        |
| Supply markup-like text or unsafe links                       | Text stays literal and unsafe URLs fail                                                       | Core and browser tests                                             |
| Navigate, filter and export                                   | Working history, pan/zoom, themes, mobile drawers and SVG download                            | Actual Chromium tests and local visual review                      |
| Reuse the original private report                             | Preserve source facts, classification and relationship topology                               | Private local regression only; never public fixtures               |

`just ci` runs documentation, formatting, JavaScript and shell lint, workflow
syntax, Git whitespace, and Node unit/CLI tests. `just browser-check` is a
separate actual Chromium gate. Hosted CI runs both with entirely synthetic data.
Tests use temporary artifacts and clean them; optional screenshots are explicit
ignored local evidence. These checks do not access Linear or publish an artifact.

[Validation records](../validation/README.md) separate observed local tests,
hosted results and visual review. Structural/test success is not perceptual
approval, installable skill proof, or release acceptance.

Source capture and mixed identity behavior are covered by
[normalization tests](../../test/normalize.test.js) and
[mixed-source browser tests](../../test/browser/sources.test.js). Host collection
evidence and lookup limitations belong in the dated validation record.

Saved-choice tests cover user ownership, current facts, absent/reappearing issues,
renamed local source keys, pending classification and new-run output protection.
Repeated context/absence transitions and identity-review reasons have explicit
regressions. CLI checks prove relative references fail before output while web
references survive every continuity command; the browser checks pending context
and the retained reference link.
[Continuity diagnostic tests](../../test/continuity-diagnostics.test.js) cover
input roles, escaped extra-property paths, choices alternatives, null/omitted
evidence equivalence, output refusals and cleanup failure. Both locale browser
cases distinguish retained classification evidence from current context choices
without changing source status or assigned counts.
See [continuity tests](../../test/continuity.test.js) and the
[dated validation](../validation/2026-09-13-classification-refresh.md).

Artifact consistency is covered by [verification tests](../../test/verify.test.js):
valid-but-altered source fields, missing/directed relations, edited or malformed
HTML (including invalid UTF-8 bytes that decode to valid replacement characters),
untouched renderer output from JSON with lone surrogates, state mismatches,
input-role diagnostics, unknown embedded keys omitted from diagnostic paths,
optional state, and read-only success/failure through symlinks. Interpretation
and presentation edits remain permitted. These checks cannot approve a taxonomy's
meaning or prove prior user choices survived; the
[classification guide](../../references/classification.md)
requires semantic membership review, and continuity still owns saved decisions.

[Normalization tests](../../test/normalize.test.js) also read the tracked
[purpose exercise capture](../../examples/purpose-capture.json) through the
normalizer and check its assigned/context scope, unknown context status,
registered relation count and expected pending classification. No category
names or grouping counts are prescribed by this executable fixture check.

## Remaining quality outcomes

State: **Target**

Distribution must prove installation and actual skill invocation when a package
exists. Automatic refresh, concurrent state reconciliation and identity rebinding
are not implemented.
