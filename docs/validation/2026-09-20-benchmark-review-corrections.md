# Benchmark independent-review corrections

Date: 2026-09-20

Scope: the three P3 findings from independent review of
[PR #28](https://github.com/weirdry/stellar/pull/28) at
`c724e3d5669f14e15414ca70e7969f4f184da2f7`, tracking
[issue #27](https://github.com/weirdry/stellar/issues/27).

## Corrections

- **F1, argument diagnostics:** malformed comma-separated size lists and existing
  output files/directories now produce argparse usage diagnostics and exit 2
  without a traceback. The harness still creates a fresh directory with `mkdir`
  and catches `FileExistsError`; there is no separate existence-check race or
  cleanup of caller-owned output. Other filesystem failures are not relabeled
  as existing-output errors.
- **F2, independent failure reporting:** absent-file and directory reference
  cases each use a named `subTest`, so a failed assertion in one does not prevent
  the other from running.
- **F3, benchmark coverage:** the performance procedure explicitly states that
  generated native IDs do not collide across providers or namespaces. Focused
  processing regressions, rather than benchmark output equivalence, protect
  source-qualified identity matching. The canonical quality chapter retains
  this division of verification responsibilities.

The supporting provenance observation is also clarified in the
[original measurement record](2026-09-20-cli-processing-costs.md). Its separate
`followup.json` lacks the protocol, runtime/harness hashes, environment and
per-output comparison evidence present in the main benchmark files. It remains
a supporting observation, not a standalone attributable benchmark. No historical
samples or missing metadata were rewritten or inferred. That file was introduced
by this PR; this limitation is not a pre-existing product defect.

## Executed regression checks

- Before the harness fix, `just benchmark-test` with the expanded suite failed
  six subcases: `abc`, an empty size argument, `100,`, `100,abc`, an existing output file
  and an existing output directory. Each produced exit 1 and a traceback instead
  of the expected usage diagnostic.
- After the fix, `just benchmark-test` passed **4/4 tests**: all six new argument
  cases, all **23** invalid-reference cases, and the existing 100-issue baseline,
  reference comparison and changed-hash/extra-artifact controls. Malformed sizes
  create no output; existing files and a directory's binary sentinel remain
  byte-identical, with no new directory entries. Invalid-input checks use a
  nonexistent Node executable to detect unintended workload execution.
- In a disposable copy, the current invalid-reference test against the original
  `7378d70` harness reported **20 named assertion failures**, including both
  `absent` and `directory`, with no test-method errors. This confirms that failure
  in the absent-file case no longer suppresses the directory case. This control
  selected only the invalid-reference method and used a nonexistent Node path;
  it was not a product execution or performance run.

The optional Python suite remains separate from `just ci`. Final repository
checks and hosted-CI evidence are recorded in the delivery PR after execution.

## Unchanged product and evidence boundary

Runtime source, runner/manifest, schemas, viewer, fixture generator and committed
raw measurements are unchanged from `c724e3d`. The runner SHA-256 remains
`4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.
No bundle regeneration or full-scale timing rerun was needed. The deep-parent
hierarchy traversal and small source/category scans remain outside this
correction. No new local browser/perceptual review, skill installation, host
discovery, live-source collection, release or runtime acceptance is claimed.
