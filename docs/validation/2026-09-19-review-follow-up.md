# Independent review follow-up — 2026-09-19

## Scope and source basis

This record covers the follow-up to the independent review of
[`09af447`](https://github.com/weirdry/stellar/commit/09af447917d24676d029a7e7cb8bf17f9278701a)
in [PR #21](https://github.com/weirdry/stellar/pull/21), tracked by
[issue #20](https://github.com/weirdry/stellar/issues/20). Its source basis is that
revision plus this follow-up diff. It records local checks before committing;
the PR owns commit-hook, clean-checkout and subsequent hosted CI results.

## Resolved findings

| Review item                                            | Result and owning evidence                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1: authority changed without a replacement decision | [ADR-0007](../decisions/0007-own-canonical-documentation-policy.md) explicitly replaces only ADR-0001's external documentation profile and policy authority. The ADR index, standards index and chapter 9 identify the replacement; ADR-0001's bytes remain unchanged.                                           |
| P3-2: core drift checks lack regression coverage       | The [isolated-copy test](https://github.com/weirdry/stellar/blob/f4ca064e458fcf26076c3fbe3b48d8ab2ba14554/test/diagrams.test.js) now rejects source/HTML/SVG drift, manifest drift, orphan HTML/SVG and a missing SVG, checking all copied files for unintended mutation.                                        |
| P3-3: unenforced generator and sidecar rules           | The [checker](https://github.com/weirdry/stellar/blob/f4ca064e458fcf26076c3fbe3b48d8ab2ba14554/scripts/docs/diagrams.mjs) requires the reviewed generator version, with a rejecting test. Local visual-check receipts and screenshots are ignored by Git.                                                        |
| P3-4: undocumented distribution growth                 | The [distribution guide](../development/distribution.md#installation-footprint) records the measured source-tree totals at the reviewed revision and accepts keeping the public documentation together. It distinguishes source bytes from actual transfer and installed size. The approved banner is unchanged. |
| P3-5: slash-less TMPDIR fails                          | The [walkthrough](../../examples/continuity-walkthrough.md) inserts the separator explicitly and enables shell error stopping before allocating its temporary directory.                                                                                                                                         |
| P3-6: meaningful labels are too small                  | Five views use tighter layouts with redundant cards removed; the artifact-ownership view promotes its tiny tag into the main label. The browser and image review below cover the rebuilt artifacts.                                                                                                              |
| P3-7: legends misidentify participants                 | Delivery actions have a contributor/maintainer/user legend, while system context distinguishes the external host from the local runner. Refresh and rendering legends also name their actual responsibilities.                                                                                                   |
| P3-8: stale gate and renderer lists                    | Contribution, development and quality lists include diagram consistency and its explicit commands. The runtime input list includes the Open Star SVG.                                                                                                                                                            |

The dark-theme observation is also resolved: default dark and explicit reader
choices persist through live OS changes. The prior dated smoke checked too soon
after media emulation; it did not establish the settled event behavior. The new
[browser regression](https://github.com/weirdry/stellar/blob/f4ca064e458fcf26076c3fbe3b48d8ab2ba14554/test/browser/diagrams.test.js) waits for actual
`matchMedia` change events before asserting the theme in all eight files, then
checks toggling, persistence after reload and URL overrides. Earlier records
remain historical; their OS-change claim is superseded by this evidence.

## Repository and workflow checks

- `just ci`: passed **70/70 Node tests**, documentation, eight diagram sets,
  formatting, lint and bundle checks.
- `just browser-check`: passed **48/48 Chromium tests**, including the new
  event-aware diagram regression and the existing product viewer suite. The
  compatible local headless shell was selected through `STELLAR_CHROME`.
- Disposable-copy mutation probes disabled the SVG comparison, extra-file
  inventory comparison and manifest comparison separately. Each made the
  expanded regression fail. The repository checker was not changed by these
  probes.
- `git check-ignore` matched visual-check JSON, HTML and PNG sidecars.
- The walkthrough's shell blocks were executed with a fresh, slash-less
  `TMPDIR`. First and final reports passed **4/4** artifact comparisons; explicit
  user classification and target survived changed text, changed agent evidence
  required review, pending validation exited 1 as expected, and reconsideration
  cleared that review. Additional allocation probes passed with and without a
  trailing slash. Inputs were invented fixtures; no live collection was run.

## Diagram generation and semantic review

`ARCHIFY_ROOT=/path/to/reviewed/archify just diagrams-build` passed for all eight
sets with **Archify 2.17.0-dev.1**, **9/9 showcase checks**, zero composition
errors and zero warnings. The adapter reproducibly changes the two startup
fallbacks and the OS-change listener, preserving explicit choices. The checker
reconstructs the original generator HTML identity as well as checking final
HTML, source and exported SVG hashes.

The six changed sources retain their node and edge meanings. The first-report
and run-verification sources are unchanged; their HTML was rebuilt for the theme
adapter. Redundant card details remain in the owning context, building-block
and runtime chapters: host-owned source access, absent-issue memory, pending
classification, escaped embedding and best-effort output cleanup. No product
logic, wire schema, runner bundle, approved banner or historical ADR was changed
in this follow-up.

## Browser measurements and image review

All eight final HTML files passed Archify `visual-check`: containment, projected
readability and control clearance at **1440×900, 1600×1000, 1920×1080 and
2048×1320**, with light/dark captures at both endpoints. Receipt hashes and byte
counts match the final manifest. Automated receipts retain `visualReview:
pending`; image inspection is recorded separately here.

A separate Chromium measurement at 1440×900, dark theme, device scale factor 1
and remote fonts blocked measured all visible SVG text, including arrow labels
and state details. The minimum non-legend semantic text in each revised view was:

| View               | Minimum projected text |
| ------------------ | ---------------------- |
| Run output         | 8.30 CSS px            |
| System context     | 9.96 CSS px            |
| Artifact ownership | 10.35 CSS px           |
| Refresh continuity | 11.46 CSS px           |
| Viewer rendering   | 11.22 CSS px           |

These measurements improve the reported 6–7 px labels; they are observations for
this viewport and font environment, not a universal accessibility threshold.
Static SVGs can still shrink in a narrow Markdown column; the linked HTML
provides the full explorable view and zoom controls.

**Image review passed:** an image-capable reviewer inspected two endpoint/theme
captures per diagram (16 images total, both themes represented for every view)
and all eight exact exported SVGs rasterized in Chromium. Labels, conditions,
legends, arrow direction, contrast and reading order were checked for clipping,
overlap and semantic agreement. The final refresh legend was inspected again
after its wording correction. This is not a claim that all 32 browser captures
were individually inspected.

Search, focus and semantic-passport opening/closure passed on all eight final
HTML files. Separate dark-default/override and SVG-image receipts also match the
manifest. Bulky captures, logs and probe scripts remain in ignored
`outputs/canonical-docs/review-followup/`.

## Final artifact identity

The following final HTML identities bind the observations above. The
[manifest](../architecture/diagrams/manifest.json) records the associated source,
original generator HTML and exported SVG hashes.

| HTML               | Bytes  | SHA-256                                                            |
| ------------------ | ------ | ------------------------------------------------------------------ |
| artifact-ownership | 709818 | `2b9c4515f37d8c84a8064a58efc778518f477bbc71a09b0f153415e5970bc5a2` |
| first-report       | 709471 | `34a461847cd45f6e2df3983873d278c091356fd1cec261912349bb25bb4b17de` |
| refresh-continuity | 705570 | `289a2288978a7a189bdd9646aa72082061aa65cc722caba344f1542695ed17a4` |
| run-output         | 706988 | `1ebacad2ca6d576558b918052e05ede6f2a3f0598bfce004e494fcf7b656d7d8` |
| run-verification   | 711471 | `481201c285120beb597658e2ea44f3257aaceabba5a896f0d7b6eb96ee51d2ed` |
| skill-delivery     | 709392 | `462824383bc4f8f48a26e8ed8e6b0d6c46d87b631e85fd1e09c1d2d68cfdb67c` |
| system-context     | 706482 | `9b7dfc841165f7a6c07ca765b9819abe2c85bb43e695e1cd9e658044ea772994` |
| viewer-rendering   | 704426 | `15fb32f98b1317dd4a05a474ea660dece3e903fedc5b99fcaaf61393fa63708d` |

## Evidence limits

These are local generation, regression, browser and image observations. They do
not establish live installation size, source-access completeness, release,
integration or updates to existing user reports. No live installation, Firefox
or Safari coverage, mobile diagram review, or exhaustive Archify interaction
and export coverage is claimed. The existing published product contract and
durable user state remain unchanged.
