# Architecture diagrams

These views inherit **As-built** from their owning chapters. They explain the
single Stellar skill and viewer; they do not introduce deployed services.

| Question                                                | Type         | Owning chapter                                                                         | Explorable view                 | Source                          | Static view                   |
| ------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------- | ----------------------------- |
| Who owns access, judgment, files and exploration?       | Architecture | [Context](../03-context-scope.md)                                                      | [HTML](system-context.html)     | [JSON](system-context.json)     | [SVG](system-context.svg)     |
| How does a first capture become a report?               | Sequence     | [Runtime](../06-runtime-view.md#first-report)                                          | [HTML](first-report.html)       | [JSON](first-report.json)       | [SVG](first-report.svg)       |
| Which interpretation survives a new capture?            | Architecture | [Runtime](../06-runtime-view.md#saved-classification-and-refresh)                      | [HTML](refresh-continuity.html) | [JSON](refresh-continuity.json) | [SVG](refresh-continuity.svg) |
| What does run verification actually prove?              | Data flow    | [Runtime](../06-runtime-view.md#verify-supplied-artifacts)                             | [HTML](run-verification.html)   | [JSON](run-verification.json)   | [SVG](run-verification.svg)   |
| What is retained when writing a run fails?              | Lifecycle    | [Runtime](../06-runtime-view.md#run-output-and-failure-boundary)                       | [HTML](run-output.html)         | [JSON](run-output.json)         | [SVG](run-output.svg)         |
| How does source reach an installed skill?               | Workflow v2  | [Distribution](../07-deployment-view.md#skill-distribution)                            | [HTML](skill-delivery.html)     | [JSON](skill-delivery.json)     | [SVG](skill-delivery.svg)     |
| How do data, locale, viewer and brand assets combine?   | Architecture | [Building blocks](../05-building-block-view.md#rendering-and-brand-assets)             | [HTML](viewer-rendering.html)   | [JSON](viewer-rendering.json)   | [SVG](viewer-rendering.svg)   |
| Which file owns facts, interpretation and continuation? | Architecture | [Artifact ownership](../05-building-block-view.md#artifact-ownership-and-continuation) | [HTML](artifact-ownership.html) | [JSON](artifact-ownership.json) | [SVG](artifact-ownership.svg) |

## Open a diagram

The SVGs embedded in the architecture chapters are static previews. To explore a
diagram, open its `.html` file from a local checkout in a browser, or download the
raw HTML file from GitHub and open that saved file. The GitHub file page itself
does not run the interactive viewer. Each HTML file contains its diagram and
viewer; no local server or Archify installation is needed to read it.

For example, on macOS, run this from the repository root:

```sh
open docs/architecture/diagrams/run-verification.html
```

Use the viewer's Find control to focus a node and inspect its relationships.
The default is dark; the theme toggle and explicit saved choice remain available.

## Generate and check

Reviewed generator: **Archify 2.17.0-dev.1**. Every source explicitly selects the
`showcase` quality profile and English locale. The workflow uses schema version
2; the other renderer types use their version 1 schemas. These are Archify source
formats, independent of Stellar's work-map and continuity contracts.

Set `ARCHIFY_ROOT` to the reviewed local skill installation. No command downloads
or updates that installation. Run the following from the repository root:

```sh
ARCHIFY_ROOT=/path/to/archify just diagrams-build
just diagrams-check
just docs-check
```

The [repository script](../../../scripts/docs/diagrams.mjs) calls the generator
for each source using this command shape:

```sh
node "$ARCHIFY_ROOT/bin/archify.mjs" deliver TYPE SOURCE.json OUTPUT.html --quality showcase --json
```

For each source edit, use Archify `validate TYPE SOURCE.json --quality showcase
--json` first and resolve its diagnostics before final delivery. `deliver`
validates the exact source and atomically replaces its individual HTML artifact.
A multi-diagram build is not a transaction: if one fails, inspect the results,
repair it, and rebuild before updating the evidence record.

After Archify delivery, the repository script replaces only the two system-theme
fallback expressions with a dark default, then reruns all nine artifact checks.
This reproducible presentation adapter preserves URL theme overrides, saved user
choices and the theme toggle. A fresh browser opens dark even when its OS is
light. The installed Archify skill and authored topology are unchanged.

The script exports the single SVG and stylesheet from that final checked HTML.
It resolves the delivered dark-theme color variables to literal values for
SVG viewers without CSS variable support, and adds a dark-theme root, a solid
background and a system monospace font stack for a standalone Markdown image.
It trims trailing stylesheet whitespace; geometry, labels, relationships and legend come
from the delivered SVG unchanged. HTML conclusion cards and interactive controls
are outside that SVG. Their engineering meaning is also stated in the owning
chapter. The HTML supports themes and exploration; the Markdown SVG is a static
dark-theme overview with no script or external font requirement.

The build verifies each delivery receipt against the exact source and HTML bytes
before applying the theme adapter. [manifest.json](manifest.json) records the
source, original generator HTML, final themed HTML and SVG SHA-256 hashes,
final HTML byte counts and the exact generator version. `just diagrams-check` compares
these with current files and recomputes the SVG export in memory. It detects
unregenerated source changes, edited views, missing sets and inventory drift;
it does not rerun Archify or prove semantic or visual quality. `just ci` includes
this read-only check. Generated HTML/SVG and frozen diagram JSON are excluded
from automatic formatting to preserve reviewed bytes.

Source filenames start with a lowercase letter and contain lowercase letters,
digits, underscores or hyphens. Every `.json` file is checked or rejected by name,
except `manifest.json` and Archify's `*.visual-check.json` browser receipts.
An added source without matching HTML and SVG fails the gate. Inventory regression
coverage lives in [diagrams.test.js](../../../test/diagrams.test.js).

## Browser and perceptual review

After successful delivery, run for each changed HTML:

```sh
node "$ARCHIFY_ROOT/bin/archify.mjs" visual-check OUTPUT.html --json
```

Set `ARCHIFY_CHROME` to a compatible Chrome/Chromium executable when discovery is
unavailable. The check measures 1440×900, 1600×1000, 1920×1080 and 2048×1320 in the
light theme, plus light/dark endpoint screenshots. Require no viewport overflow,
readable labels and unobstructed viewer controls. Inspect the actual screenshots
for composition and semantics; the automated receipt keeps `visualReview` pending.
Also inspect exported SVGs as images for Markdown use.

Move generated `.visual-check.*` sidecars to ignored `outputs/canonical-docs/`
after review. Keep them out of the maintained diagram inventory. Record hashes,
structural results, source review, browser results and perceptual observations
separately in a dated [validation record](../../validation/README.md). Changing
source or HTML invalidates evidence bound to the previous hash. A generator
upgrade requires a deliberate rebuild and the same review; hashes alone are not
an approval mechanism.

The initial review is recorded in
[canonical documentation validation](../../validation/2026-09-19-canonical-documentation.md).
The [content follow-up](../../validation/2026-09-19-architecture-content.md)
adds the artifact-ownership view and checks the synthetic continuity walkthrough.
