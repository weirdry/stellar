# 10. Quality

State: **As-built**

| Scenario                                                      | Expected behavior                                                                                                      | Evidence owner                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Render different owners and classifications                   | Same viewer works without source edits                                                                                 | [Synthetic examples](../../examples/README.md), core/browser tests |
| Render either supported locale under another browser language | Owner-derived name and fixed UI follow input locale; source facts stay unchanged                                       | Core/browser tests and locale catalogs                             |
| Invalid identities, categories or endpoints                   | Field-specific diagnostic and repair; no report replacement                                                            | [Core tests](../../test/core.test.js)                              |
| Select an issue or expand a group                             | Source-backed neighbors, direction and synchronized selection                                                          | [Browser tests](../../test/browser/viewer.test.js)                 |
| Opposite relations connect the same visible nodes             | Each relation can be selected independently in the reviewed overview and neighborhood                                  | [Browser regressions](../../test/browser/regressions.test.js)      |
| Target names differ only in whitespace                        | Dropdown and tag selection match the exact authored target                                                             | [Browser regressions](../../test/browser/regressions.test.js)      |
| Use browser shortcuts or reopen a cleared search              | Browser defaults and camera remain independent; Enter selects only visible results                                     | [Browser regressions](../../test/browser/regressions.test.js)      |
| Search context or inspect filtered assigned work              | Both remain searchable, labels distinguish their scope, and assigned counts are preserved                              | [Browser regressions](../../test/browser/regressions.test.js)      |
| Select a target from a context issue                          | Shared targets select assigned work; context-only tags cannot activate an overlay                                      | [Browser regressions](../../test/browser/regressions.test.js)      |
| Revisit the selected node or use an owner with whitespace     | No redundant history entry; header and SVG retain the literal owner name                                               | [Browser regressions](../../test/browser/regressions.test.js)      |
| Fit four parallel relations in a phone neighborhood           | Visible relation labels do not overlap; each source relation remains independently selectable                          | [Browser regressions](../../test/browser/regressions.test.js)      |
| Fit long Korean/English group names in a small phone overview | Six fixture labels clear nodes, text and controls; full names and selection stay accessible                            | [Overview regressions](../../test/browser/overview.test.js)        |
| Fit a short phone overview with upward area labels            | Names clear the caption; repeat-fit, resize and panning retain consistent camera behavior                              | [Overview regressions](../../test/browser/overview.test.js)        |
| Fit small maps with two groups per area or five desktop areas | All area names remain visible in the tested overviews, with text clear of dots and controls                            | [Layout regressions](../../test/browser/layout.test.js)            |
| Expand neighboring phone groups successively                  | Current issue footprints reserve area separation; visible dots select their own issues and area centers stay fixed     | [Layout regressions](../../test/browser/layout.test.js)            |
| Focus a target on an uncluttered desktop                      | All six fixture group names remain visible using per-line text bounds                                                  | [Layout regressions](../../test/browser/layout.test.js)            |
| Fit a 320 × 568 phone and follow a cross-area arrow           | Visible text clears caption/minimap; fixture source curves avoid unrelated dots/text and opposite arrows stay distinct | [Layout regressions](../../test/browser/layout.test.js)            |
| Read names after fitting and navigation                       | Visible area/group names remain associated with their owning dot                                                       | [Layout regressions](../../test/browser/layout.test.js)            |
| Resize a wide map with long area names through phone width    | Six fixture names retain their endings on return; text clears dots/controls; fit help explains cropping                | [Layout regressions](../../test/browser/layout.test.js)            |
| Toggle relations or return with Back                          | Visible text still clears fixed controls at the unchanged camera                                                       | [Layout regressions](../../test/browser/layout.test.js)            |
| Fit short stages or select a group on a phone                 | Dots remain distinct; selected-group issue IDs remain available; dense views may need pan/zoom                         | [Layout regressions](../../test/browser/layout.test.js)            |
| Include context or unknown detail                             | Context remains outside totals; status stays unknown                                                                   | Validator and browser tests                                        |
| Supply markup-like text or unsafe links                       | Text stays literal and unsafe URLs fail                                                                                | Core and browser tests                                             |
| Navigate, filter and export                                   | Working history, pan/zoom, themes, mobile drawers and SVG download                                                     | Actual Chromium tests and local visual review                      |
| Reuse the original private report                             | Preserve source facts, classification and relationship topology                                                        | Private local regression only; never public fixtures               |

`just ci` runs documentation, formatting, JavaScript and shell lint, workflow
syntax, Git whitespace, bundle currency, and Node unit/CLI tests.
`just browser-check` is a separate actual Chromium gate. Hosted CI runs both with
entirely synthetic data.
Layout regressions also override the test page's font with Arial/sans-serif:
four fixtures require retained area names, clear text, owning-dot association,
unchanged embedded facts and repeatable framing. Ubuntu resolves that font to
Liberation Sans; the same fixtures catch the fallback-width failures on macOS.
The product keeps its existing system-font stack.
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

[Reader and retention tests](../../test/reading.test.js) cover bounded indexes
and chunks, exact reconstruction of arbitrary/multilingual text and line endings,
late exclusions in unheaded prose, literal search across structural boundaries,
Unicode match-start locations, colliding display identifiers, missing descriptions,
draft input, canonical diagnostic repair fields, and preservation of existing
response files including aliases. Native null/empty/omitted body observations,
Unicode preview truncation boundaries and differentiated output-failure repairs
are covered at the CLI boundary. They also exercise the host's reuse of complete
endpoint objects as context records for both providers while incomplete references
stay unqueried. They do not prove semantic relevance,
live response provenance or a host's token savings.

The [distribution tests](../../test/distribution.test.js) exercise an installed
runner without development dependencies, compare HTML with the source renderer,
and reject generated-file drift without mutation. Dated
[installation evidence](../validation/2026-09-18-skill-installation.md) records actual
installer, workflow and historical-runner recovery results. Every release also
requires installation from its published tag before release acceptance is claimed.

## Remaining quality outcomes

State: **Target**

Host discovery is a separate, unverified observation. Automatic refresh,
concurrent state reconciliation and identity rebinding are not implemented.
