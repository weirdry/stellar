# CLI performance measurements

The optional `just benchmark` command measures the actual installed bundle on
invented inputs. It is a contributor experiment, separate from `just ci` and
browser responsiveness checks. Requires macOS or Linux, `/usr/bin/time`, and the
repository-pinned Node installed by `just init`. Active benchmark/profile tools
and their tests use TypeScript; Python is retained only for archived native experiments.

## Run and compare

Choose fresh directories under a disposable parent. An existing output file or
directory is preserved and rejected with a usage diagnostic and exit 2, without
a stack trace. The benchmark never accepts real captures or saved user state.
The default run generates 1,000, 10,000 and 50,000 assigned issues and takes
several minutes and a few GiB of disk/RAM. Keep other CPU-intensive work idle.

```sh
just init
just benchmark /tmp/stellar-before

# After a source change, explicitly regenerate the bundle before comparing.
just build-runner
just benchmark /tmp/stellar-after /tmp/stellar-before/results.json
```

`just benchmark` first checks bundle currency, then copies the committed-format
runner, manifest and resources into its fresh output directory and checks every
manifest hash. The source checkout is not used for timed product execution.
Setup, fixture authoring and verification are outside timing samples. The
benchmark neither installs a skill nor modifies an existing installation.

A small harness smoke test uses the same protocol with fewer inputs/trials:

```sh
just benchmark /tmp/stellar-smoke '' 100 1
```

Sizes must be distinct multiples of 20, at least 100; trials must be positive.
Malformed size lists also exit 2 with a usage diagnostic before output creation
or workload execution.
Use matching sizes, trial count and fixture script bytes for a comparison.
An explicitly supplied reference must be readable UTF-8 JSON with a matching
`protocol` object and a nonempty `artifacts` object mapping names to SHA-256
hex digests. Invalid references (including `{}`, `[]` and `null`) exit 2 before
the harness creates its output directory or launches a workload process. Omit the reference argument
only when intentionally collecting a new baseline.
Reference mode rejects any differing synthetic input or expected output hash,
as well as a differing artifact inventory. It is intentionally strict: use it
for behavior-preserving changes with unchanged schemas/viewer content. Changed
output contracts need a separately justified comparison rather than disabling
the mismatch.

Run `just benchmark-test` after editing this optional tooling. It checks malformed
size lists, preservation of existing output paths, invalid references before
output creation, baseline and reference-mode execution on 100
synthetic issues, and hash/inventory mismatch detection. This Node suite has no
timing thresholds and remains separate from `just ci`. `just profile-test` covers
attribution arithmetic, preserved shuffle ordering, contained artifact paths and
macOS/Linux resource parsing without real workloads. Hosted CI runs both converted
suites on Linux in a separate step, with no performance threshold.

## Work and evidence

[fixtures.ts](../../scripts/bench/fixtures.ts) owns the generator and explicit
synthetic classifications. Half the issues come from each of two invented
Linear/GitHub sources. Each source has a balanced parent hierarchy; the graph
has 2N blocks edges and N−2 parent edges. Initial classifications are user-owned
for one quarter of issues. A seed map is authored from the normalized draft and
validated through `remember`; this does not measure initial `classify-draft`.

The steady case changes statuses and selected user-owned titles without pending
agent review. Churn at sizes up to 10,000 replaces 10% of identities and changes
selected purpose text, then applies explicit choices for pending classifications.
Both cases assert user classification/target preservation. `verify-run` must
pass capture facts, embedded map, exact bundled viewer and state/map consistency.
Every timed output must match its corresponding setup artifact byte for byte;
reference mode additionally compares those artifacts across implementations.
Generated native IDs never collide across providers or namespaces. The focused
[processing tests](../../test/processing.test.ts) cover identity-qualification
regressions that this benchmark comparison cannot detect.

[benchmark.ts](../../scripts/bench/benchmark.ts) launches fresh processes serially,
with deterministically shuffled operation order and warm OS file caches. It
reports all raw wall/CPU/peak-RSS samples, medians and min/max wall times, protocol,
environment, revision, harness hashes, runtime hashes, artifact hashes and
verification receipts in `results.json`. An uncommitted implementation can share
its parent's Git revision; the runner/resource hashes identify the actual timed
bytes. Wall time includes startup, reading, validation/computation, serialization,
writing and exit, plus the system-time wrapper launch. `/usr/bin/time -l` on
macOS and GNU time on Linux report direct-child user + system CPU and maximum
RSS. CPU is printed to hundredths of a second (10 ms resolution), coarser than
the earlier Python `wait4` accounting. macOS RSS is bytes and Linux RSS is KiB;
results normalize both to MiB. This is full-process peak RSS, not retained heap.
The `measurement` metadata records these semantics.

Operation order retains Python's integer-seeded MT19937/Fisher-Yates behavior,
recorded under `ordering` (and the profiler protocol). Contributor-only
[random.ts](../../scripts/bench/random.ts) preserves the original serial trial
order; fixed Python-generated vectors test multiple trials and generator-block
boundaries. Fixture-source hashes change with conversion: collect fresh
matching baseline/candidate results and do not combine old/new samples into one
measurement series. Old receipts remain
unchanged historical evidence.

`refresh` includes normalization: do not add its time to `normalize` to describe
a saved-state workflow. `render` measures HTML generation, not browser layout or
interaction. CPU profiles, when needed, are separate executions and must not be
mixed into the timing samples. The staged runner and generated fixture files are
retained for those investigations; repeated trial outputs are removed only after
their hashes match. All retained benchmark inputs are synthetic and disposable.

Commit small, reviewed JSON measurements and a dated interpretation under
[validation](../validation/README.md), not generated multi-megabyte inputs or
reports. Preserve the hardware model/RAM and uncontrolled conditions in that
record; the environment block is not a complete hardware inventory. Three
samples are exploratory observations, not universal speed guarantees or CI
timing limits. Native-language mocks, fresh-host installation, live source access
and release/runtime acceptance require separate evidence.

## Attribute remaining costs

After a successful synthetic benchmark, run profiles against its retained stage
and inputs in a separate fresh directory:

```sh
just profile /tmp/stellar-after /tmp/stellar-profile
just profile-test
```

`just profile BENCHMARK_DIRECTORY OUTPUT [TRIALS]` defaults to three trials per
case and profiling mode. It verifies the benchmark fixture identity, recorded
input/setup hashes and staged runtime against the checkout's integrity manifest.
It profiles normalization and refresh at the smallest and largest available
sizes, rendering at the largest size, and classification at the largest size
up to 10,000. Equal cases are deduplicated. A size-100 benchmark with one profile
trial gives eight instrumented executions as a small smoke check.

CPU and allocation sampling run in separate, serial processes in a reproducibly
shuffled order. Every profiled output must match the benchmark's recorded setup
hash before a result is accepted. The profiler retains its raw files, logs and
outputs locally; allow additional disk space beyond the baseline run. The final
`results.json` records runtime, fixture, baseline-result and profiler hashes,
environment, protocol, output hashes, and per-trial summaries. Machine-specific
file URLs are normalized in summaries; raw profiles are local artifacts.

- [Node CPU sampling](https://github.com/nodejs/node/blob/main/doc/api/cli.md#--cpu-prof)
  uses a 1,000-microsecond interval. Self attribution weights each sampled frame
  by its time delta; inclusive attribution also credits its ancestors, counting
  a recursive frame only once per sample. Percentages use total sampled time,
  including idle and GC. They are not POSIX CPU accounting or a separate timer
  for every operation, and inclusive percentages overlap.
- Allocation sampling starts in a Node preload with a 512-KiB interval and
  [includes objects collected by major and minor GC](https://chromedevtools.github.io/devtools-protocol/v8/HeapProfiler/#method-startSampling).
  Estimated allocation volume includes temporary objects during the sampled
  interval; it is neither retained heap nor process peak RSS, and does not
  account for every native/external allocation or pre-preload startup object.
- Instrumented wall/CPU/RSS observations include profiler overhead. Use the
  separate, uninstrumented benchmark for command timings and process peak RSS.
  Parsing, stringification and native work can be charged to their JavaScript
  caller; source inspection is required, and sampling alone does not split every
  native operation or asynchronous file wait into an exact independent cost.
- Summaries retain the top 20 self frames, the top 30 inclusive frames plus named
  product paths, and all unlisted self weight. Raw-profile hashes identify the
  complete local profiles. `just profile-test` checks weighted attribution,
  recursion handling and conservation of self weight with invented profiles;
  actual staged execution/output parity is a separate smoke check.

The [post-optimization study](../validation/2026-09-20-post-optimization-profile.md)
records measured costs and the original proposal for a native comparison boundary.
The later hybrid and standalone studies below have their own protocols and results;
the profiling study does not adopt another language or establish a native speedup.

## Experiment with native workers

The optional [Go/Rust experiment](../../scripts/bench/native/README.md) measures
whole normalization commands with a native worker for identity resolution,
issue materialization and relation deduplication. Capture/source validation,
URL resolution, final validation and atomic writing remain in Node. JSON transfer
and process overhead are included; this is not a standalone native CLI benchmark.

Use the hybrid guide's separate checkout at
`0fe3abb5bf044812bc63a6519fe188e7c5fefbee` with its own frozen dependencies.
The stager expects the archived JavaScript core, not the current TypeScript source.
Run `just native-build FRESH_OUTPUT` and
`just native-compare BUILD BENCHMARK FRESH_OUTPUT [TRIALS]` after generating the
synthetic baseline above. Native compilers are explicit optional prerequisites,
not requirements for the product or default CI. The harness requires output and
diagnostic parity before timing, rejects timed native fallbacks, and records
sampled process-tree RSS separately from uninstrumented wall/CPU measurements.
See the [native comparison record](../validation/2026-09-20-native-normalize-comparison.md)
for observed results and the limits of the recommendation.

## Standalone core archive

The [standalone experiment](../../scripts/bench/standalone/README.md) moves reading,
validation, normalization and output storage into Go/Rust without a Node wrapper.
It includes product and normalize-only Node controls. Its semantic JSON comparison
and macOS per-process RSS protocol differ from the hybrid study's byte/diagnostic
comparison and sampled process-tree RSS; the measurements are separate datasets.

`just standalone-check` verifies retained source/lock hashes, raw samples, summary
calculations and correctness receipts. `just standalone-replay FRESH_OUTPUT`
rebuilds the pinned experiment, regenerates the exact corpus and checks outcomes
before timing from the guide's pre-conversion archive checkout at
`0fe3abb5bf044812bc63a6519fe188e7c5fefbee`; it extracts product baseline
`77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b` and refuses changed dependency manifests.
Follow its explicit macOS/toolchain prerequisites and use separate
output for each run. Original results are preserved, not regenerated by CI.

The [dated interpretation](../validation/2026-09-21-standalone-normalize-comparison.md)
records the known surrogate mismatch, specialized draft validation, diagnostic
limits and accepted direction: retain Node, adopt TypeScript for static safety,
exclude Go and defer Rust migration. The [typed core/CLI](typescript-adoption.md)
now implements that source direction; no native language migration is adopted.
