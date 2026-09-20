# Node, Go and Rust normalization comparison — 2026-09-20

State: **As-built** local synthetic experiment. Product language and contracts are unchanged.

## Result and decision

Retain the optimized JavaScript implementation for the current CLI. Neither native
worker improved complete normalization latency at the tested boundary. At 50,000
issues, Go took about 50% longer and Rust about 51% longer than Node. Their
small relative difference is not a sound basis for choosing a language.

This tests **Node plus a short-lived native worker**, not a standalone Go/Rust
CLI. Node still owns capture/schema/source validation, relationship collection,
GitHub URL/repository resolution, final work-map validation and atomic output.
The worker owns alias/identity resolution, issue construction, status/metadata
translation and relation deduplication. JSON transfer, process startup, retained
Node work and all serialization/writing are inside the command timer.

The result does not rule out gains from a full native rewrite, a different data
boundary, FFI, persistent workers, typed data structures or further prototype
tuning. None of those alternatives was measured. No migration is adopted and
no product dependency, schema, installed bundle or viewer asset changes.

## Revision, environment and method

- Product baseline: `0b557c352c34e8b9594d70f607d67f8bd9b28bad` (`dev`); version `0.1.2-dev.0`.
- The experiment was uncommitted when measured: the result records the parent
  Git revision and exact build-source, harness, bundle, worker and input hashes.
- Product runner SHA-256: `4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.
- Mac15,9 / Apple M3 Max, arm64, 16 logical CPUs, 48 GiB RAM, macOS 26.5.
- Node 24.19.0, Go 1.26.8, Rust/Cargo 1.96.0, Python 3.14.7.
- Go: default optimized `go build -trimpath`, local toolchain, standard JSON.
  Rust: locked Cargo release, optimization level 3, LTO, one codegen unit;
  `serde_json` 1.0.145 with insertion-order preservation and `base64` 0.22.1.
- No `NODE_OPTIONS`, `NODE_V8_COVERAGE`, `GOFLAGS`, `GOGC`, `GOMAXPROCS`,
  `RUSTFLAGS` or `CARGO_ENCODED_RUSTFLAGS` override was present.
- Same retained 1k/10k/50k synthetic captures and expected drafts as the
  post-optimization benchmark. Half Linear, half GitHub; balanced parent trees
  and 2N blocks edges. This is not a deep-chain or concurrent-load test.
- One untimed warm-up per size/engine; five fresh-process trials per case,
  serial, deterministic shuffled order, warm filesystem caches. No profiler
  runs during timing. Background OS activity, scheduling and thermal state
  were not controlled; five samples are exploratory, not confidence intervals.

The experimental Node bundle with no worker (`probe-node`) is a control. It is
within about 1.3% of the committed Node runner in median wall time for all three
sizes. This supports attributing the observed regression to this worker path,
rather than a large difference in the Node entry/bundle; it does not isolate
the exact share of JSON transfer, allocation, computation or GC.

## Whole-command observations

Medians of five executions, milliseconds. CPU is POSIX process CPU including
waited-for descendants; it can exceed wall time. The raw file retains all
samples and min/max wall times.

| Issues | Mode               | Wall median (ms) | CPU median (ms) | Wall range (ms) |
| ------ | ------------------ | ---------------: | --------------: | --------------- |
| 1,000  | Node baseline      |           127.47 |          171.17 | 123.76–129.92   |
| 1,000  | Node probe control |           125.89 |          169.98 | 123.96–129.78   |
| 1,000  | Node + Go          |           144.05 |          191.39 | 143.63–146.65   |
| 1,000  | Node + Rust        |           142.92 |          184.50 | 140.02–143.48   |
| 10,000 | Node baseline      |           374.59 |          578.15 | 368.78–378.53   |
| 10,000 | Node probe control |           376.57 |          582.47 | 370.18–379.45   |
| 10,000 | Node + Go          |           514.35 |          712.51 | 511.49–520.69   |
| 10,000 | Node + Rust        |           520.76 |          677.87 | 506.94–527.11   |
| 50,000 | Node baseline      |          1443.63 |         1955.87 | 1429.85–1510.71 |
| 50,000 | Node probe control |          1440.43 |         1951.46 | 1427.35–1446.43 |
| 50,000 | Node + Go          |          2166.57 |         2852.56 | 2147.29–2209.32 |
| 50,000 | Node + Rust        |          2181.70 |         2646.44 | 2155.94–2191.10 |

## Memory observations

One **separate sampled process-tree RSS** run per case. Values below are the
largest simultaneous sum seen across the Node process and its worker, not a
sum of per-process maxima. A 20 ms sleep plus `ps` duration means short-lived
peaks may be missed; shared pages can be counted twice. These are sampled lower
bounds on aggregate RSS, not exact physical memory or retained heap. Sampling
changes execution; these runs are excluded from the wall/CPU table.

| Issues | Mode               | Sampled tree peak (MiB) | Samples |
| ------ | ------------------ | ----------------------: | ------: |
| 1,000  | Node baseline      |                   82.61 |       3 |
| 1,000  | Node probe control |                   85.09 |       3 |
| 1,000  | Node + Go          |                  105.94 |       4 |
| 1,000  | Node + Rust        |                  102.33 |       4 |
| 10,000 | Node baseline      |                  318.77 |       9 |
| 10,000 | Node probe control |                  319.50 |       9 |
| 10,000 | Node + Go          |                  343.53 |      12 |
| 10,000 | Node + Rust        |                  410.55 |      12 |
| 50,000 | Node baseline      |                 1094.77 |      32 |
| 50,000 | Node probe control |                 1094.61 |      33 |
| 50,000 | Node + Go          |                 1265.31 |      47 |
| 50,000 | Node + Rust        |                 1721.84 |      48 |

The observation supplies no evidence of a memory saving from this split.
Do not compare its values directly with the earlier single-process `wait4` peak
RSS figures. `wait4` RSS is retained in the raw results only as a platform metric.

## Correctness and executable evidence

- The canonical normalization suite passed **15/15** in each of four modes,
  including source identities, alias conflicts, context resolution, status
  mapping, diagnostics, same-file/symlink refusal and preservation
  of previous output on failure. The isolated CLI in those tests is the
  experimental CLI; no-worker runs exercise its unchanged JavaScript branch.
- A second corpus exercised **58 cases × 4 modes = 232 CLI invocations**, with
  174 comparisons against the 58 committed-runner results. Exit code, stdout,
  stderr and complete output bytes matched. Existing-output sentinels remained
  byte-identical on failure. This includes malformed JSON, cross-provider IDs,
  late aliases, Unicode/UTF-16 ordering, large safe GitHub numbers and invalid
  metadata/relations/sources.
- 37 corpus inputs were accepted and 21 rejected. Of the accepted inputs, 35
  used each actual native worker; the lone-surrogate and non-string status
  coercion cases deliberately used the original JavaScript implementation.
  Rejected inputs can fail before the worker or fall back for canonical
  diagnostics. Those cases do not count as native semantic support.
- Four disposable negative controls refused an occupied output (sentinel unchanged),
  build-source drift and benchmark artifact drift before output creation, and an
  always-failing Go worker before any timing samples. Fallback success cannot
  silently become a native performance result.
- **60/60 timed outputs**, all warm-ups and all 12 separate memory outputs
  matched their complete baseline draft SHA-256. All 30 timed native outputs
  had a `native` receipt; no fallback was accepted as a native timing.
- An earlier exploratory pass exposed avoidable Rust reference cloning. The
  retained final implementation borrows observed records, matching the existing
  JavaScript/Go reference approach; every final correctness and timing case was
  rerun after that correction. The earlier pass is not pooled into the results.

Finite parity checks do not prove a drop-in replacement for arbitrary inputs.
The workers are generic JSON prototypes. Unsupported coercions and surrogate
escapes fall back, and a schema-valid but factually wrong response could evade
the final validator. Do not install these experimental bundles. Product output
validation, byte parity and runtime acceptance remain separate concepts.

## Reproduction and retained artifacts

```sh
just native-build /tmp/stellar-native-build
just native-compare /tmp/stellar-native-build /tmp/stellar-baseline /tmp/stellar-native-results 5
```

Generate `/tmp/stellar-baseline` with `just benchmark` first. See the
[experiment procedure](../../scripts/bench/native/README.md) and
[performance guide](../development/performance.md) for prerequisites, precise
responsibilities, fresh-directory rules and sampling limitations.

- [Raw final measurements](data/2026-09-20-native-normalize/results.json)
  SHA-256: `0e220c18689d98869294b87cbbc062b2193e17976533444158d1fecc7484648e`.
- Synthetic captures, staged CLIs, compiler caches, worker binaries and raw
  per-invocation stdout/stderr/receipts remain in ignored local outputs.
  Only compact JSON measurements, source and interpretation are committed.

## Validation boundary

The native comparison is a local workstation experiment. Native compilation,
differential replay and timings are not part of the default CI toolchain.
`just ci` passed: 87/87 Node tests, zero skips, documentation, all eight diagram
sets, formatting, lint and bundle currency. Go formatting and Rust formatting
checks passed separately. Hosted CI
does not rerun this benchmark. No browser behavior or rendering contract was
changed, so no new local browser/visual acceptance is claimed. No standalone
native CLI, FFI, persistent worker, installer, fresh host, live connector, Windows,
Linux native performance or release/runtime acceptance was exercised.

Refs #31. The preceding profiling work is tracked separately in #29 / PR #30.
