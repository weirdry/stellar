# Standalone normalization and core-language direction

Date: 2026-09-21

Scope: archive the synthetic standalone experiment discussed in
[issue #31](https://github.com/weirdry/stellar/issues/31), after the separate
[hybrid study](2026-09-20-native-normalize-comparison.md) in
[PR #32](https://github.com/weirdry/stellar/pull/32) was integrated into `dev`.
This record concerns a complete `normalize` slice; it does not implement a product
language change or approve native-core migration.

## Question and accepted direction

The hybrid study retained validation and output storage in Node. Its result could
not decide whether a standalone core would benefit Stellar. This experiment moves
reading, JSON parsing, capture/schema validation, provider/reference preparation,
normalization, output-schema and draft-semantic validation, serialization and output
storage into each native program. Go/Rust do not invoke Node. Browser visualization
is outside the measured command.

The accepted direction is to retain Node execution and the current skill distribution,
prioritize TypeScript adoption planning for static type safety, exclude Go from
current candidates and defer Rust migration. [Issue #33](https://github.com/weirdry/stellar/issues/33)
owns TypeScript planning; TypeScript implementation is not an outcome of this record.
Existing runtime JSON/schema validation remains necessary regardless of source language.

The observed Rust benefit at 50,000 issues is about **16.5% elapsed time, or 0.23 s**.
This does not establish a product need to assume OS/architecture-specific executable
build, distribution, update and support work. Each chosen native target adds that
responsibility; supporting every possible target is not assumed. Reconsider only
when observed latency, memory pressure or Node installation requirements justify it.

## Original measurements

Five measured fresh processes per size/engine, after one untimed warmup, in
deterministically shuffled serial order. Values are medians; wall time is milliseconds
and peak process RSS is MiB. The same synthetic capture and expected complete draft
are used across all engines.

| Implementation              | 1,000 issues | 10,000 issues | 50,000 issues | Peak RSS at 50,000 |
| --------------------------- | -----------: | ------------: | ------------: | -----------------: |
| Product Node CLI            |        120.8 |         362.5 |       1,401.6 |            1,097.1 |
| Normalize-only Node control |        106.9 |         345.7 |       1,411.8 |            1,006.4 |
| Standalone Go               |         38.5 |         316.2 |       1,634.5 |              709.8 |
| Standalone Rust             |         23.0 |         224.8 |       1,170.4 |              853.9 |

At 50,000 issues, Go takes about 16.6% longer while using about 35.3% less median
peak RSS than the product CLI. Rust uses about 22.2% less. Both native programs
have a larger startup advantage for the small command. These results concern
these implementations and dependencies, not an intrinsic language ranking.

The [raw rows](data/2026-09-21-standalone-normalize/benchmark.json) retain wall time,
CPU, peak RSS, output bytes/hash, invocation order and semantic-match receipts.
The [summaries](data/2026-09-21-standalone-normalize/summary.json) retain min/max as
well as medians. Five trials do not establish tail latency or production throughput.

The workload mixes invented Linear/GitHub records, Unicode descriptions, blocking
relations and balanced parent trees. Output relation counts are 2,998 / 29,998 /
149,998. The largest capture is 55,150,867 bytes. Deep chains, high fanout, many
sources and real workloads were not characterized.

## Protocol and equivalence

The product Node control uses the unchanged installed bundle. The focused Node
control bundles the unchanged normalizer, general validator and artifact writer
without unrelated CLI initialization. Both native cores own the entire command,
including canonical schema loading/compilation on every invocation and private
temporary-file/rename storage.

`posix_spawn` directly launches each binary; Python compares outputs only after
the measured process exits. `wait4` supplies user+system CPU and macOS peak process
RSS. CPU can exceed wall time for multithreaded runtimes. RSS is not retained heap
or aggregate process-tree memory. Warm file caches, compilation outside timing,
no `fsync`, no cache flush, no CPU pinning and no exclusive-host reservation are
explicit conditions. The original host was macOS 26.5 arm64 with Node 24.19.0,
Go 1.26.8, Rust/Cargo 1.96.0 and Python 3.14.7. Hardware-model/RAM queries were
blocked, so those values remain unavailable in the
[environment record](data/2026-09-21-standalone-normalize/environment.json).

Original correctness observations:

- The copied reference normalization suite passed **15/15 tests**.
- **169 serialized inputs** comprise 60 authored probes and 109 canonical-test
  inputs. They are not 169 independent product tests; some overlap is intentional.
  Node accepts 68 and rejects 101. Focused Node matches **169/169**; each native
  core matches **168/169** for acceptance, complete output and success summary.
- Both natives reject all 101 reference-rejected inputs without replacing previous
  output. All fields and every array's order match for the 67 supported accepted
  inputs. Object-key order and equivalent escape spellings may differ.
- Within this corpus, the known difference is an unpaired UTF-16 surrogate: Node accepts it, Go explicitly
  rejects it to avoid replacement, and Rust's parser rejects it. Valid escaped pairs
  and literal backslash-u strings have separate passing cases. No fallback is used.
- **22 storage/standalone checks** cover 0600 new files, replacement after success,
  direct/symlink input-overwrite refusal and output-directory failure without input
  changes. Failure paths require an unchanged directory inventory. The original
  success-path leftover check recognized only `.stellar-*.tmp`, missing Rust's
  `.tmp…` convention; the [review corrections](2026-09-21-standalone-review-corrections.md)
  add complete inventory checks and a new replay. Native programs also work with
  Node absent from PATH. This is macOS behavior, not crash durability or symlink-race proof.
- All **72 benchmark invocations** produce complete decoded JSON equal to the
  reference draft. This is semantic equality, not byte equality across engines.

The public [correctness](data/2026-09-21-standalone-normalize/correctness.json) and
[storage](data/2026-09-21-standalone-normalize/safety.json) receipts omit stderr;
they retain all other outcome and input-identity fields. Diagnostic provenance
and exact code/path/message/fix equality are not implemented by the native cores.
The original final correctness receipt combines unchanged Node/Go observations
with a rerun of the final Rust implementation; the archival replay below runs all
four engines together against that expected result.

## Implementation limits

Go uses its general JSON object representation, URL parser and
`santhosh-tekuri/jsonschema/v6`; Rust uses `serde_json` with insertion-order
preservation, `jsonschema`, `url` and `tempfile`. Exact versions and transitive
resolution belong to the retained [Go](../../scripts/bench/standalone/go/go.mod)
and [Rust](../../scripts/bench/standalone/rust/Cargo.toml) manifests and locks.
The native nonblank schema regex uses the ECMAScript whitespace set. Rust's final
implementation moves intermediate JSON trees; the superseded copying variant
and its measurements are outside this archive's final result.

Native semantic validation specializes in the unclassified normalization draft:
source identities/namespaces, issue/native uniqueness, URLs, relation endpoints,
self-edges, duplicate edges, one parent per child and parent cycles. It does not
implement arbitrary classified-work-map validation. Node's general validator
creates missing-classification diagnostics which normalization filters; native
draft validators avoid creating them. This is a meaningful implementation
difference, not complete feature equivalence.

Review also demonstrated a Rust numeric-format difference outside the frozen
169-case corpus. An accepted GitHub `number` written as `7.0` or `7e0` yields
identifier `#7.0` in Rust, versus `#7` in both Node controls and Go. A closed
record with `state_reason: 7.0` yields `closed · 7.0` versus `closed · 7`.
Rust formats `serde_json::Number` directly on these paths rather than reproducing
JavaScript's `String(number)` behavior. The
[correction record](2026-09-21-standalone-review-corrections.md) records targeted
reproduction. These additional probes do not revise historical 168/169 counts,
source bytes, input hashes or timing results.

The prototypes simplify diagnostics, generally stopping at the first failure.
Go's URL parser is not WHATWG. URL corners, malformed UTF-8, other numeric/coercion
cases beyond the tested probes, filesystem faults beyond the recorded checks,
other platforms/CPUs and all other CLI workflows remain unverified. The known
surrogate and numeric-format differences rule out describing these binaries as
drop-in replacements. No rendering,
classification, refresh, continuity, installer or live-source outcome is claimed.

## Provenance and archival replay

The original read-only product baseline was `ad8ef5292dc18947e1e23277e69bea6ea7abcd05`.
Runner SHA-256 is `4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.
The archive starts from merged `dev` at `77ee2b9`; product source/resources are
unchanged. [Baseline identity](data/2026-09-21-standalone-normalize/baseline-identity.json),
[measured artifacts](data/2026-09-21-standalone-normalize/artifacts.json) and
[archive provenance](data/2026-09-21-standalone-normalize/archive-provenance.json)
distinguish original fingerprints from the relocated replay scripts.

Final native source and dependency locks are byte-identical to the measured ones.
Raw benchmark/summary/environment/artifact JSON is preserved. The original paths,
manual setup, console logs, binaries, large captures/drafts and compiler caches
remain local. The replay adapter regenerates the exact 169 input hashes, checks
the known mismatch before timing and writes new results to a fresh directory.
It does not overwrite historical results or claim reproducible binary hashes.
The later [review corrections](2026-09-21-standalone-review-corrections.md) strengthen
the archive/replay checks without changing those measured inputs or implementations.

See the [reproduction procedure](../../scripts/bench/standalone/README.md) and
[data inventory](data/2026-09-21-standalone-normalize/README.md).

## Executed archival verification

The repository replay ran on the same macOS arm64 host with the versions recorded
above. The complete command used a new disposable directory; the checks below
describe that completed run.

- `just standalone-check`: exact retained source/lock and raw-data hashes, 72
  ordered samples, twelve recomputed summaries, 169 case receipts and 22 storage
  receipts passed.
- `just standalone-replay FRESH_OUTPUT`: the pinned reference and instrumented
  collector each passed 15/15 tests with zero skips. All 169 regenerated input
  hashes and all four engines' public correctness receipts exactly matched the
  archive. All 22 storage checks and 72 benchmark invocations passed.
- The rebuilt Go binary reproduced the original SHA-256
  `c916bf366094b2c999e9274a270ff9facd4ed8f254590a58381c632977c7c9f1`.
  This observed match is not a cross-host binary reproducibility promise.
- Eight disposable controls passed: occupied file, directory and dangling symlink
  were preserved with usage exit 2; zero size, duplicate sizes and zero trials
  were rejected before output creation; source-byte and raw-measurement drift
  were rejected by the archive checker.
- `gofmt -l` reported no files; `cargo fmt --check` passed. `just ci` passed 87/87
  Node tests with zero skips, documentation, eight diagram sets, formatting,
  lint and bundle currency. Final commit/hosted-CI evidence is in the delivery PR.

The new timing files stay local: the table still describes the original run.
No new local browser/visual check is claimed because product rendering and its
input contract are unchanged. This standalone archive has not inherited PR #32's independent review: that review
covered the hybrid experiment only. Same-host replay is not host-independent
performance reproduction, fresh-host installation, release or runtime acceptance.
