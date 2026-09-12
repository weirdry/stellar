# 10. Quality

State: **As-built**

| Scenario                                                      | Expected behavior                                                                     | Evidence owner                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Render different owners and classifications                   | Same viewer works without source edits                                                | [Synthetic examples](../../examples/README.md), core/browser tests |
| Render either supported locale under another browser language | Owner-derived name and fixed UI follow input locale; source facts stay unchanged      | Core/browser tests and locale catalogs                             |
| Invalid identities, categories or endpoints                   | Field-specific diagnostic and repair; no report replacement                           | [Core tests](../../test/core.test.js)                              |
| Select an issue or expand a group                             | Source-backed neighbors, direction and synchronized selection                         | [Browser tests](../../test/browser/viewer.test.js)                 |
| Opposite relations connect the same visible nodes             | Each relation can be selected independently in the reviewed overview and neighborhood | [Browser regressions](../../test/browser/regressions.test.js)      |
| Target names differ only in whitespace                        | Dropdown and tag selection match the exact authored target                            | [Browser regressions](../../test/browser/regressions.test.js)      |
| Include context or unknown detail                             | Context remains outside totals; status stays unknown                                  | Validator and browser tests                                        |
| Supply markup-like text or unsafe links                       | Text stays literal and unsafe URLs fail                                               | Core and browser tests                                             |
| Navigate, filter and export                                   | Working history, pan/zoom, themes, mobile drawers and SVG download                    | Actual Chromium tests and local visual review                      |
| Reuse the original private report                             | Preserve source facts, classification and relationship topology                       | Private local regression only; never public fixtures               |

`just ci` runs documentation, formatting, JavaScript and shell lint, workflow
syntax, Git whitespace, and Node unit/CLI tests. `just browser-check` is a
separate actual Chromium gate. Hosted CI runs both with entirely synthetic data.
Tests use temporary artifacts and clean them; optional screenshots are explicit
ignored local evidence. These checks do not access Linear or publish an artifact.

[Validation records](../validation/README.md) separate observed local tests,
hosted results and visual review. Structural/test success is not perceptual
approval, installable skill proof, or release acceptance.

## Remaining quality outcomes

State: **Target**

Source collection must expose freshness and incomplete lookup boundaries.
Saved editing/refresh must preserve explicit user decisions. Distribution must
prove installation and actual skill invocation when a package exists. These
are future capabilities, not separate gates for internal renderer layers.
