# Standalone archive review corrections

Date: 2026-09-21

Scope: follow-up to the independent review of [PR #34](https://github.com/weirdry/stellar/pull/34)
at `dc09b5a5f594b7621c3673add0b8f5a1d26264e1`, based on merged `dev`
`77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b`. This corrects the archive verification
tools and documents an additional prototype limitation. It does not change the
measured implementations or the accepted Node/TypeScript direction.

## Corrections

- **Python optimization:** importing `check_archive.py` now rejects disabled
  assertions before checking evidence or staging replay output. This also guards
  `replay.py`; `safety.py` independently refuses optimized execution. The scripts
  use assertions as verification logic, so `-O`, `PYTHONOPTIMIZE=1` and
  `PYTHONOPTIMIZE=2` must fail rather than report unchecked success.
- **Source inventory:** the checker requires exactly ten measured-source entries:
  `go/cli.go`, `go/core.go`, `go/go.mod`, `go/go.sum`, `rust/Cargo.lock`,
  `rust/Cargo.toml`, `rust/src/cli.rs`, `rust/src/main.rs`, `cases.mjs` and
  `focused-entry.mjs`. Missing or unexpected entries in the selected source
  inventory fail before fingerprint comparison, even when the manifest's own
  provenance fingerprint has been deliberately repinned. Other historical
  manifest entries still describe artifacts intentionally kept outside Git.
- **Storage inventory:** success may add only the destination and its required
  parent directories; failure must leave the path inventory unchanged. This
  replaces the success-path `.stellar-*.tmp` glob, which did not cover Rust's
  `.tmp…` names. The previous failure-path inventory check already covered those
  names. No actual native tempfile leak was observed.
- **Rust numeric formatting:** record the difference below outside the frozen
  corpus. Correcting the prototype would change measured source, so this follow-up
  preserves it as a known limitation rather than silently changing the experiment.

## Additional numeric probes

Using the existing archival replay's built programs, seven synthetic inputs were
run through all four engines in a separate disposable directory. The input is the
retained `mixed.json` case with one field changed; numeric tokens are written as
raw JSON rather than passed through JavaScript serialization, which would erase
the spelling being tested. For `number`, the first assigned GitHub record changes;
for `state_reason`, the closed context record changes. All 28 invocations succeed.

| Raw input                                             | Node CLI, focused Node and Go | Rust                        |
| ----------------------------------------------------- | ----------------------------- | --------------------------- |
| `number: 7.0`, `7e0`, `7.00`, `0.7e1`, `7E0`, `7.0e0` | Identifier `#7`               | Identifier `#7.0`           |
| Closed issue, `state_reason: 7.0`                     | Status label `closed · 7`     | Status label `closed · 7.0` |

Rust formats `serde_json::Number` directly for these paths; it does not reproduce
JavaScript's `String(number)` behavior. These are known semantic differences, not
object-key or equivalent JSON escape differences. The original corpus still has
169 inputs and the recorded native 168/169 result, with only the lone-surrogate
acceptance difference in that corpus. No historical count, sample or input hash
has been revised to include the seven additional probes.

## Executed verification

- `just standalone-check` passed with the unchanged archive.
- `just standalone-test` passed **8/8 Python tests**. Controls cover source drift,
  an inconsistent correctness receipt, all three optimized modes across checker,
  replay and storage entry points with no output creation, removal of each of the
  ten source entries and addition of an unexpected Rust entry after repinning.
  Storage controls allow a clean six-case synthetic Rust protocol and reject
  `.tmp…`, `.stellar-*.tmp` and arbitrary leftovers during new-file, replacement
  and no-Node success paths; a failure-path leftover is also rejected. This fake
  engine tests the verifier, not native implementation correctness.
- Three disposable regression controls restored the old checker or storage helper
  from `dc09b5a` while retaining the new tests. The optimization, source-inventory
  and success-path leftover tests each failed against the old implementation.
- `just standalone-replay FRESH_OUTPUT 100 1` passed on macOS arm64 with Node
  24.19.0, Go 1.26.8, Rust/Cargo 1.96.0 and Python 3.14.7. Both the pinned reference
  and instrumented collector suites passed **15/15 with zero skips**. All **169**
  regenerated input hashes and four-engine receipt projections matched; all
  **22 storage checks** and **8 benchmark invocations** passed. Builds, input
  staging and output stayed in a new disposable directory.
- `just ci` passed **87/87 Node tests with zero skips**, documentation, eight
  diagram sets, formatting, lint and bundle currency.

The small replay verifies execution of the corrected checks, not a new full-scale
performance conclusion. The original full-size measurements in the
[comparison record](2026-09-21-standalone-normalize-comparison.md) remain the source
of timing claims. Final commit and hosted-CI evidence belong to
the delivery PR; hosted CI does not run the optional Python/native experiment.

Measured Go/Rust source and locks, `cases.mjs`, `focused-entry.mjs`, all historical
JSON data, product code/bundle, schemas, viewer and dependency manifests remain
unchanged. No new local browser/visual check, cross-host/platform test, installer,
release or runtime acceptance is claimed. This follow-up has not itself undergone
independent re-review.
