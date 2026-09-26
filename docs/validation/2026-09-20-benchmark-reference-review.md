# Benchmark reference validation correction

Date: 2026-09-20

Scope: the P3 self-review finding on [PR #28](https://github.com/weirdry/stellar/pull/28)
at `7378d70346135f3bb5bc1d5905fd13973ce24482`, tracking
[issue #27](https://github.com/weirdry/stellar/issues/27).

## Correction

The previous harness used the truthiness of decoded JSON to select reference
mode. Explicit files containing `{}`, `[]` or `null` therefore completed with
exit 0, skipped cross-run comparisons and recorded `reference_matched: false`.
These were reproduced during self-review. The product CLI is not involved in
reference parsing.

The harness now distinguishes an omitted argument from a supplied reference.
A supplied reference must be readable UTF-8 JSON with a matching protocol object
and a nonempty artifact object mapping nonempty names to SHA-256 hex strings.
Invalid inputs exit 2 with an argparse diagnostic before the harness creates
output or launches a child process. Existing hash and final-inventory checks
remain active, and `reference_matched` becomes true only for a completed run
with a validated supplied reference. `just benchmark` still checks bundle
currency before entering the harness.

## Regression coverage

`just benchmark-test` runs the optional Python standard-library suite in
[test_reference.py](https://github.com/weirdry/stellar/blob/21d57ade55c80d90b508fe884bb6c057a2ae2de9/scripts/bench/test_reference.py), separately from the
normal Node/CI gate. There are no performance thresholds or Python additions to
product requirements.

- Twenty-three invalid-reference cases cover false/empty JSON values, missing
  or incorrectly typed protocol/artifact fields, a mismatched protocol, empty
  names, malformed hashes, malformed JSON, invalid UTF-8, an absent file and a
  directory. Every case asserts exit 2, empty stdout, a reference diagnostic,
  no traceback and no output creation, using a nonexistent Node executable to
  ensure failure occurs before a workload process can run.
- A 100-issue, one-trial baseline succeeds with `reference_matched: false`.
  Comparing a fresh run against it succeeds with `reference_matched: true`,
  identical artifact fingerprints, four timing rows and two four-part verification
  receipts. Timings from these smoke runs are not performance evidence.
- A structurally valid changed hash and an extra artifact still fail comparison
  without producing a successful results file. The original baseline bytes stay
  unchanged.

## Observed local results

- `just benchmark-test`: both tests passed, including all 23 invalid-reference
  subcases and the successful/failing comparison scenarios above.
- Applying the new suite to an isolated clone of `7378d70` fails the invalid
  reference test, including `{}`, `[]` and `null`; its baseline/comparison test
  still passes. This demonstrates sensitivity to the reviewed defect.
- A separate `just benchmark` run with 100 issues and one trial accepted the
  valid pre-correction smoke reference: `reference_matched: true`, four timed
  comparisons and two four-part verification receipts. Existing valid result
  files need no conversion.

## Evidence boundary

The runtime code, installed bundle/manifest, schemas, viewer and fixture
generator are unchanged from `7378d70`. The original
[performance measurements](2026-09-20-cli-processing-costs.md) used valid
references and remain historical observations of their recorded harness/runtime
hashes. The old measurement JSON is not rewritten to claim it came from this
corrected harness. No full-scale timing rerun, new local browser run, installer,
live-source, release or runtime acceptance is implied by this tooling fix.

Final local commands, regression sensitivity and hosted checks are recorded in
the delivery PR after execution.
