# Direct body reading and file-first collection

Date: 2026-09-28

State: **As-built**

## Scope

[Issue #44](https://github.com/weirdry/stellar/issues/44) implements the first
bounded recommendations from [the investigation](https://github.com/weirdry/stellar/issues/43).
`read-body MAP.json ISSUE [OFFSET]` reads up to 4,000 Unicode code points directly
from the complete description. Short bodies need no body-index call. Longer
bodies have exact whole-body offsets and explicit continuation. The existing
block reader, indexes, search and native capture/map/state shapes are unchanged.

Boundary classification: released — compatibility required because v0.1.3
distributes the existing CLI and saved-file contracts. This additive command
preserves those interfaces; it introduces no migration or saved-state rewrite.

The [GitHub recipe](../../references/github.md#retain-list-responses-before-model-delivery)
uses an already authenticated host CLI to save native REST pages before returning
only file metadata. It refuses an occupied response path, stops on retrieval or
page-parsing failure, and retains partial responses as failed evidence. It is
not a Stellar network client and does not establish host parity or token savings.
Normalized connector output must not be mistaken for native REST identity fields.

## Executable checks

- `just init` reused repository-pinned tools and frozen dependencies; no tool or
  dependency lock changed. `just build-runner` regenerated the delivered runner
  and manifest from the maintained source.
- The skill-creator validator accepted the skill entry. Its PyYAML dependency was
  installed in a temporary validation environment, not the product dependency set.
- [Reader tests](../../test/reading.test.ts) cover exact Unicode and CRLF recovery,
  chunk edges, draft acceptance, empty/null/missing observations, ambiguous
  identifiers, invalid offsets and private diagnostics. A CLI regression checks
  whole-body continuation on both maintained source and the installed-format
  bundle. Existing block-reader and search tests remain applicable.
- [Recipe execution](../../test/collection-recipe.test.ts) extracts and runs the
  documented shell example against an invented paginated `gh` response. It checks
  exact retained bytes, owner-only file permissions, metadata-only stdout, request
  arguments, no second request for an occupied output, and non-success for failed
  retrieval, malformed JSON and wrong page shapes. This local fixture does not
  authenticate to GitHub or test provider pagination behavior.

The required complete local gate is `just ci`; exact final-head local and hosted
results belong to the associated PR and issue. No timing threshold is imposed.

## Explicit synthetic workflow

The author exercised the revised skill path from the development checkout in a
fresh ignored output directory using root Just commands. The public
`mixed-capture.json` was retained unchanged and normalized. One metadata catalog
identified four assigned issues across three source namespaces and one context
issue. All four short descriptions were read directly with `read-body`; no
structural body index was needed. Each result matched its entire source body and
reported null continuation.

After reviewing the titles and bodies, the existing synthetic choices grouped
transit calibration/evaluation together and kept runtime control and shared
delivery work separate. The two repository-local `#7` identifiers were selected
by their distinct canonical IDs. This is an authored example review, not an
independent blind classification study. The unclassified context remained context;
three registered relations were preserved.

`classify-draft`, `validate`, `render` and `verify-run` completed successfully.
The final run had no pending assigned classification. `captureFacts`,
`embeddedMap`, `bundledViewer` and `stateMap` all passed. Retained capture SHA-256:
`73b07c279bb63eb61b589989cd32fe428f3e5598fe96833ecb1baab590d4d807`.
The run artifacts remain local; source captures were wholly invented examples.

## Limits

The local exercise proves explicit command use and artifact consistency, not
automatic skill discovery, fresh installation, live collection completeness,
general classification quality, or measured model-token savings. No private
source data was collected. The viewer and its input contract were unchanged;
this task did not perform new local browser or visual acceptance. Hosted checks,
dev integration, publication and installation are separate outcomes.

Multi-issue batching, a focused refresh view, and broad instruction restructuring
remain outside this implementation. The existing conservative refresh and user
authority rules were not modified.
