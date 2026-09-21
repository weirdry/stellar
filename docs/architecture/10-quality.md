# 10. Quality

State: **As-built**

## Planned static checking

State: **Target**

The [TypeScript plan](../development/typescript-adoption.md#implementation-acceptance)
defines strict core/CLI coverage, declaration-drift detection, negative type
fixtures and behavioral comparison requirements. These checks are not part of
the current gate. Implementation must retain runtime validation, file safety,
user-choice continuity and the minimal installed-layout/browser suites; a passing
compiler would not prove input validity, performance or release acceptance.

## Product quality scenarios

State: **As-built**

The [product priorities](01-introduction-goals.md#quality-priorities) become the
following observable outcomes. Evidence owners define the checks; a linked test
is not a claim that it ran for the current checkout. Dated records identify the
actual revision, commands, results and remaining scope.

| Quality outcome and trigger                                                                               | Observable success                                                                                                                                                                                                                                                                   | Evidence owner and limit                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Traceable facts:** combine sources with repeated identifiers, incomplete lookups or unknown context.    | Identities remain source-qualified, registered edges keep their meaning/direction, unknown facts stay unknown, and each source's scope/freshness/coverage remains inspectable. Context never enters assigned totals.                                                                 | [Normalizer tests](../../test/normalize.test.js), [source browser tests](../../test/browser/sources.test.js), [capture guide](../../references/capture.md). Local validation cannot prove host pagination, permissions or complete collection.                                                                                                      |
| **Useful purpose classification:** assigned work spans inconsistent projects and labels.                  | Every assigned issue has one primary category and an evidence-based rationale. Membership expresses a shared outcome; target overlap does not create a dependency. Context needs no invented classification.                                                                         | The [classification guide](../../references/classification.md) owns semantic membership review; [validator tests](../../test/core.test.js) check completeness and references. A valid schema cannot judge meaning. The [purpose exercise](../../examples/README.md#purpose-classification-exercise) supports review without prescribing a taxonomy. |
| **Continuity of user intent:** refresh after status/text changes, temporary absence or user corrections.  | Current facts come from the new capture. User-owned classification and targets survive independently; absent decisions stay outside the map. Changed agent evidence requires explicit review, and pending assigned classification blocks rendering.                                  | [Continuity](../../references/continuity.md), [continuity tests](../../test/continuity.test.js), [diagnostic tests](../../test/continuity-diagnostics.test.js), and the [worked example](../../examples/continuity-walkthrough.md). No automatic identity rebinding or branch reconciliation is implied.                                            |
| **Inspectable artifact consistency:** generate or verify a report from selected inputs.                   | The same ordered map and renderer produce identical HTML bytes. Verification compares current capture facts, embedded map, exact viewer bytes and optional state/map consistency without modifying inputs.                                                                           | [Core tests](../../test/core.test.js), [verification tests](../../test/verify.test.js), [run guide](../../references/runs.md). These comparisons do not establish source authenticity, semantic correctness, historical continuity or pixel identity across browsers.                                                                               |
| **Safe local output:** input contains markup-like text, unsafe URLs or a failing output destination.      | Text stays literal; unsafe links and invalid input fail. Failed HTML generation preserves the previous report; continuity refuses existing run paths and limits cleanup to its own new output. Private state is not automatically embedded in HTML.                                  | [Renderer tests](../../test/core.test.js), [first-run tests](../../test/classify-draft.test.js), [continuity diagnostics](../../test/continuity-diagnostics.test.js), [local-data rules](08-crosscutting-concepts.md#local-data-and-security). Cleanup is best effort, not a crash-safe transaction; sharing remains a caller responsibility.       |
| **Readable exploration:** navigate, resize, filter or select overlapping work in either supported locale. | Selection stays synchronized across tree/graph/inspector; counts and source directions remain correct. Visible labels identify their nodes, full names remain accessible, and framing preserves usable separation. Input locale controls fixed UI while source text remains literal. | The [viewer regression map](../../assets/viewer/README.md#verification-ownership) owns exact layouts, fonts, viewport fixtures and interactions. Browser and image review cover named scenarios, not every graph; dense views can require pan/zoom.                                                                                                 |
| **Portable execution:** install the skill outside a development checkout.                                 | The bundled Node runner operates without contributor dependencies and reproduces the source renderer; generated-file drift is detected without mutation.                                                                                                                             | [Distribution tests](../../test/distribution.test.js), [installation evidence](../validation/2026-09-18-skill-installation.md) and [published-tag evidence](../validation/2026-09-19-v0.1.0-release.md). Installation, host discovery, invocation and live source access are distinct observations.                                                 |

Installed diagnostics have separate [CLI tests](../../test/cli-diagnostics.test.js):
version/help remain available with missing schemas, doctor reports missing,
unreadable or changed files without executing them, and invalid usage does not
start a workflow. Mixed `--help` or `-h` requests cannot create or overwrite outputs;
literal `search-issue` text stays usable. Error pointers execute with quoted
paths, and runtime loading failures retain safe cause/location information
without printing damaged schema contents. Source and installed entry points
share the help catalog.
The build gate also checks the generated integrity manifest against current
source/resource bytes and compares the fixed inventory with the current schema,
viewer, and locale directory conventions before any artifact write.
[Distribution tests](../../test/distribution.test.js) inject unlisted resources
and remove required files in disposable copies, reject named duplicates and
non-file resource paths before artifact writes, exclude hidden editor/OS files
and optional assets, and verify that metadata-only package edits preserve
generated bytes while version
and runtime changes cause drift. See [build scope](../development/distribution.md#runtime-files)
for discovery patterns and their limits. These observations concern local consistency, not release
authenticity, automatic repair or host authentication.

Retention and progressive reading support traceability: the
[reader tests](../../test/reading.test.js) check bounded structural indexes, exact
substrings, literal search and complete reconstruction. The
[reading guide](../../references/reading.md) requires expanding beyond previews
when needed. These checks establish neither semantic sufficiency nor token or
latency savings for a host.

## Verification responsibilities

`just ci` runs documentation structure and diagram consistency, formatting, JavaScript/shell lint, workflow syntax,
Git whitespace, bundle currency and Node unit/CLI tests. `just browser-check`
separately exercises the product and canonical diagram themes in Chromium. The hosted workflow invokes both
with synthetic data; a local pass is not a hosted-CI result. Detailed visual
regressions belong with the [viewer](../../assets/viewer/README.md), not in a
second architecture-level test inventory.

The host agent reviews purpose, source coverage and handoff claims. A maintainer
reviews implementation and selected rendered images. [Validation records](../validation/README.md)
separate these observations from automated assertions and release acceptance.
A report's own collection, interpretation and visual review remain necessary
where relevant even when repository checks pass.

## CLI performance evidence

The optional [performance procedure](../development/performance.md) compares the
actual bundled CLI on generated synthetic inputs. It records raw timing and
peak-RSS samples independently from correctness gates. Before/after artifact
hashes and `verify-run` receipts protect full output equivalence; focused
[processing regressions](../../test/processing.test.js) protect identity matching,
ordering, input preservation and diagnostic behavior. Workstation timings do not
set CI thresholds or imply browser performance, production capacity or native
language migration gains.
The [initial processing comparison](../validation/2026-09-20-cli-processing-costs.md)
records targeted improvements, unchanged artifacts, timing variability, memory
limits and the decision to retain eager schema preparation.
Explicit benchmark references must pass structural/protocol validation before
the harness creates output or starts a child process. The optional
`just benchmark-test` suite protects rejection of invalid references and malformed
size lists, preservation of existing output paths, and actual artifact comparison.
[Reference correction evidence](../validation/2026-09-20-benchmark-reference-review.md)
and [independent-review corrections](../validation/2026-09-20-benchmark-review-corrections.md)
record these checks separately from the product CI gate. The generated workload
has no native-ID collisions across providers or namespaces; the focused processing
tests own that coverage, independently of the benchmark artifact comparisons.
Optional CPU/allocation [profiling](../development/performance.md#attribute-remaining-costs)
preserves those benchmark outputs while attributing remaining costs. Weighted
CPU samples and estimated allocation volume are distinct from uninstrumented
latency and peak RSS. The [post-optimization study](../validation/2026-09-20-post-optimization-profile.md)
records the original candidate boundary, separately from the later experiments
and language direction below.

The separate [native-worker study](../validation/2026-09-20-native-normalize-comparison.md)
compares the current Node CLI with experimental Go/Rust workers at a specific
hybrid boundary. Its optional harness checks exact draft bytes and diagnostics,
records native fallbacks, and includes process/JSON transfer in whole-command
timings. Separate process-tree RSS sampling is an approximate observation,
not a CI memory threshold. Native compilers and this experimental code are not
product dependencies, and the study does not establish standalone-native or
installation readiness.
Its canonical suite covers mixed native/fallback behavior; designated differential
cases and timed native invocations separately require native-success receipts.
The [review corrections](../validation/2026-09-21-native-review-corrections.md)
also verify insertion-anchor rejection before the stager creates its output.

The later [standalone normalization archive](../validation/2026-09-21-standalone-normalize-comparison.md)
measures Go/Rust owning input, validation, normalization and output without Node.
It preserves the measured source/locks, raw samples and public correctness receipts.
Its 169-case comparison has one known native acceptance difference; additional
probes expose Rust numeric-to-text differences outside that corpus. Native
diagnostics/draft validation do not provide full CLI equivalence. The optional
`just standalone-check` validates archive consistency; `just standalone-replay`
checks regenerated input hashes and expected outcomes before separate measurements.
Both refuse optimized Python, and storage replay checks complete directory
inventories. `just standalone-test` fault-injects these guards without compiling
natives; see the [review corrections](../validation/2026-09-21-standalone-review-corrections.md).
These commands are not default CI dependencies or evidence of product/native installation.

## Documentation quality

The [canonical policy](../development/documentation.md) governs ownership,
same-change updates and source-grounded states. `just docs-check` checks the L0
corpus, indexes and local links. `just diagrams-check` checks committed JSON,
HTML and exact SVG exports against their manifest without requiring Archify in
CI. Neither checks the meaning of an arrow or the legibility of a screenshot.

Diagram generation, semantic review, browser measurements and perceptual review
are recorded separately in the [initial documentation review](../validation/2026-09-19-canonical-documentation.md)
and [content follow-up](../validation/2026-09-19-architecture-content.md). The
[diagram guide](diagrams/README.md) owns reproducible generation and review
commands. These checks do not validate a user report or establish hosted success.

## Remaining quality outcomes

State: **Open**

Fresh-host discovery and invocation must be observed for the selected host;
installation evidence alone does not prove them. Classification usefulness,
selective-reading sufficiency and readability on a new dataset require review
of that actual run. [Risks and limitations](11-risks-technical-debt.md) identify
when to revisit these boundaries without inventing a benchmark or operational
service. Automatic refresh, concurrent reconciliation and identity rebinding
are not accepted implementation commitments.
