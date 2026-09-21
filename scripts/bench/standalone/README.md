# Archived standalone normalization experiment

This is a frozen contributor experiment, separate from the
[Node/native-worker study](../native/README.md). Go and Rust own reading, parsing,
capture/schema validation, normalization, draft-semantic validation, serialization
and temporary-file/rename output. Neither native program invokes Node. The two
controls are the product Node CLI and a bundle containing only its unchanged
normalizer, validator and writer. Browser rendering is outside all four paths.

The [dated record](../../../docs/validation/2026-09-21-standalone-normalize-comparison.md)
owns the results, known surrogate/numeric-format differences and accepted language direction.
These prototypes are not product dependencies or installed skill commands.

## Retained material

- `go/` and `rust/` contain the final measured source and dependency locks,
  byte-identical to the temporary experiment. They are reference prototypes,
  not maintained alternative product cores.
- `focused-entry.mjs` and `cases.mjs` preserve the measured JavaScript bytes.
  `extra-cases.json` retains the exact two additional serialized Unicode probes.
  The preserved generator's `native` flags are historical authoring hints;
  replay uses the final receipts, never those flags to skip cases or allow fallback.
- `differential.py`, `safety.py` and `benchmark.py` retain the comparison protocol.
  Host paths are replaced with replay configuration; sizes/trials are selectable,
  and storage checks refuse an occupied fixture directory.
- `replay.py` supplies the previously manual setup: a pinned product copy,
  canonical-test input extraction, native builds and checked replay. It requires
  the recorded correctness outcomes before starting timing.
- [Retained data](../../../docs/validation/data/2026-09-21-standalone-normalize/README.md)
  identifies raw measurements, public receipt projections and original hashes.
  Binaries, compiler caches, full generated captures/drafts, console logs and the
  superseded intermediate Rust implementation are not committed.

## Check the archive

```sh
just standalone-check
```

Requires Python 3.11+ from the contributor environment. This read-only check
requires the fixed ten-entry measured-source inventory before checking its hashes.
It also verifies retained raw-data hashes, the 72-sample randomized order,
all twelve calculated summaries and the correctness/storage receipts. It does
not execute the native programs or establish new performance results. Python
and native compilers remain outside the product and default CI dependencies.
Both check and replay refuse Python optimization (`-O` or nonzero
`PYTHONOPTIMIZE`) before doing any evidence or output work: their assertions are
required verification logic. The storage helper independently enforces this too.

Run `just standalone-test` for the optional Python fault-injection suite, without
native compilers. It covers optimization refusal, source/receipt corruption,
missing/unexpected source inventory even after repinning the manifest, and
prefix-independent detection of leftover files on successful and failed writes.

## Reproduce in a fresh directory

Use the archival PR checkout, with full Git history containing baseline
`77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b`. That merged revision has the same
product source, bundle and schemas as the measured `ad8ef529` baseline. The
runner checks recorded baseline hashes and refuses changed dependency manifests.
`just init` provides the repository-pinned Node and JavaScript dependencies;
the disposable baseline reads that dependency installation through a symlink.

Requires macOS, Python 3.11+, Node 24.x, Go and Rust/Cargo on PATH. The measured
versions were Python 3.14.7, Node 24.19.0, Go 1.26.8 and Rust/Cargo 1.96.0.
No global compiler installation is performed. Fresh locked Go/Cargo downloads
require network access; the measured commands operate on local synthetic files.
The replay deliberately rejects other operating systems because the original
RSS conversion uses macOS `wait4` bytes. It makes no Linux/Windows claim.

```sh
just init
just standalone-check
just standalone-test
just standalone-replay /tmp/stellar-standalone-replay

# A smaller timing replay still runs all 169 cases and 22 storage checks.
just standalone-replay /tmp/stellar-standalone-smoke 100 1
```

Choose a fresh output path with an existing parent. Existing files, directories
and dangling symlinks are refused before staging. The command retains a partial
directory and logs if a later build or check fails; use a different fresh path
for the next attempt. It never resets the original experiment or an installation.
Allow several minutes and a few GiB of disk/RAM for cold compilation and the full
workload. Keep other CPU-intensive work idle. Unset `NODE_OPTIONS`, `GOMAXPROCS`,
`GOMEMLIMIT`, `GOGC` and `RUSTFLAGS` to match the recorded configuration.

The command:

1. Copies the pinned baseline and verifies its identity. Runs its 15-test suite.
2. Builds the focused Node control and generates 60 synthetic probes. A separate
   instrumented copy extracts 109 serialized inputs from the unchanged canonical
   tests. All 169 input hashes must match the retained corpus before native builds.
3. Builds Go with `-trimpath -mod=readonly` and Rust with locked release dependencies,
   LTO and one codegen unit. Build output and caches stay inside the new directory.
4. Compares all decoded JSON fields, array order, acceptance and success summaries.
   All receipts must match the retained projection: only native rejection of the
   lone-surrogate case is expected. Any additional difference aborts before timing.
5. Runs the 22 storage/standalone checks. A successful write may add only the
   destination and its required parent directories; failure must preserve the
   directory inventory. This detects leftover files regardless of their prefix,
   including Rust's `.tmp…` names. Generates the timing inputs; at the three
   original sizes, capture hashes must equal the historical ones.
6. Launches fresh processes serially, with one warmup and five measured trials per
   size/engine by default. Every timed output must equal its full reference draft.

New results are written under `OUTPUT/results/`; historical committed measurements
are never overwritten. New timings describe the new host/run, even when source
bytes match. Native binary hashes can differ with toolchain or build path,
especially Rust debug/panic paths. Focused-bundle comments can also encode
dependency-resolution paths; binary reproducibility is not a claimed outcome.

## Measurement boundary

Wall time includes process startup, file input, JSON/schema processing, normalization,
validation, pretty serialization, temporary output and rename through process exit.
Builds, fixture generation and oracle comparison occur outside the timed interval.
`posix_spawn` directly launches each binary, avoiding inherited Python heap RSS from
a `fork` child. CPU and peak process RSS come from `wait4`; RSS is neither retained
heap nor a portable cross-OS metric. Filesystem caches are warm; no `fsync`, cache
flushing, CPU pinning or exclusive-host reservation is performed.

The native draft validator is specialized, diagnostics are simplified, and semantic
JSON equality permits object-key/escape differences. Finite parity is not full CLI
compatibility, and normalization timing is not whole-workflow or browser performance.
Outside the frozen corpus, Rust also renders accepted numeric spellings such as
`7.0`/`7e0` differently from JavaScript when creating identifiers or status labels.
See the [review correction record](../../../docs/validation/2026-09-21-standalone-review-corrections.md).
The measured kernels, corpus and original observations remain unchanged.
