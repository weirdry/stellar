# CLI classification and validation processing costs

Date: 2026-09-20

Scope: [issue #27](https://github.com/weirdry/stellar/issues/27), based on
`c81e96edffd783d1f4e000203422581123b66244`, version `0.1.2-dev.0`.
These are internal JavaScript optimizations; published contracts, input formats,
saved files, schema checks and viewer behavior are unchanged.

## Implementation and identity

`applyChoices` validates before building issue-ID and canonical memory-identity
indexes into its cloned state. Per-choice lookup retains the existing objects,
array order and actor checks; identity JSON encoding is unchanged. Parent
validation records whether its traversal found a cycle instead of rescanning
earlier diagnostics after every parent. It retains traversal order and the first
cycle diagnostic, then continues later validation.

The committed-format runner grew from 368,658 to 368,756 bytes. Timed bundle
SHA-256 identities:

- Baseline: `377817998e41fafd354cb0ae73a150287c518f2457c68835f5f785b6957659f3`.
- Candidate: `4e00e7644a60f4a67e7aeac38bdf10374e260a6f91f04fc6d778223c6e245718`.

Both measurement files record the base Git revision because the implementation
was still uncommitted; runtime hashes identify the actual candidate. Schemas,
viewer assets, dependency versions and third-party notices are unchanged.

## Reproduction and measurements

Follow the [performance procedure](../development/performance.md). The portable
generator and harness are in this change; to recreate the baseline, use those
same scripts with the base revision's current bundle/resources, then compare
the candidate in a fresh directory. `just benchmark` is separate from CI timing
gates. The initial baseline smoke used size 100 and one trial, then full runs
used default sizes and three trials. Bundle currency passed before measurement.

For example, from this candidate checkout, prepare an isolated base checkout
with only the measurement scripts and recipe added (all named destinations must
be fresh):

```sh
git worktree add --detach /tmp/stellar-profile-base c81e96edffd783d1f4e000203422581123b66244
cp -R scripts/bench /tmp/stellar-profile-base/scripts/bench
cp justfile /tmp/stellar-profile-base/justfile
(cd /tmp/stellar-profile-base && just init && just benchmark /tmp/stellar-before)
just benchmark /tmp/stellar-after /tmp/stellar-before/results.json
```

Machine: Apple M3 Max, arm64, 16 logical CPUs, 48 GiB RAM, macOS 26.5,
Node 24.19.0, Python 3.14.7. Fresh processes, serial execution, warm OS file
caches, shuffled operation order. Timings include startup through exit and all
file writes. Workstation activity and thermal state were uncontrolled. The
generator preserves the investigation's synthetic workload; capture JSON is now
pretty-printed by the portable harness, so these refreshed baselines supersede
the earlier compact-input timing observations for this comparison.

Raw samples, ranges, process peak RSS, environment and source/artifact hashes:
[baseline](data/2026-09-20-cli-processing/baseline.json),
[candidate](data/2026-09-20-cli-processing/optimized.json).

| Issues | Command                  | Baseline median ms | Candidate median ms | Baseline / candidate |
| -----: | ------------------------ | -----------------: | ------------------: | -------------------: |
|  1,000 | normalize                |             137.40 |              135.99 |                 1.01 |
|  1,000 | refresh                  |             194.26 |              203.15 |                 0.96 |
|  1,000 | render                   |             118.71 |              119.30 |                 1.00 |
|  1,000 | classify (200 choices)   |             209.67 |              183.27 |                 1.14 |
| 10,000 | normalize                |             481.96 |              402.55 |                 1.20 |
| 10,000 | refresh                  |            1001.42 |              914.36 |                 1.10 |
| 10,000 | render                   |             242.28 |              259.17 |                 0.93 |
| 10,000 | classify (2,000 choices) |            4886.51 |              746.71 |                 6.54 |
| 50,000 | normalize                |            3672.08 |             1721.76 |                 2.13 |
| 50,000 | refresh                  |            6153.91 |             4600.43 |                 1.34 |
| 50,000 | render                   |             846.24 |              878.09 |                 0.96 |

This demonstrates a substantial reduction in the targeted reclassification and
large-draft paths, not a universal improvement. `refresh` already includes
normalization. `render` measures HTML generation, not browser responsiveness.

Peak RSS was not materially reduced: at 50,000 issues the median was
1096.77 → 1097.22 MiB for normalize, 1925.39 → 1978.48 MiB for refresh, and
902.19 → 902.27 MiB for render. At 10,000 issues classify was
559.44 → 567.16 MiB. These are observed full-process peaks; no retained-heap or
allocation attribution was performed, and no memory-improvement claim follows.

The initial runs showed slower small refresh and render medians. A separate
seven-trial check alternated baseline/candidate process order on the same
baseline inputs and compared every output byte. Results overlap substantially:

| Case          | Baseline median [min, max] ms | Candidate median [min, max] ms |
| ------------- | ----------------------------: | -----------------------------: |
| 1,000 refresh |       201.97 [198.65, 460.43] |        198.54 [196.55, 203.34] |
| 10,000 render |       266.53 [251.82, 312.81] |        268.14 [252.90, 304.26] |
| 50,000 render |      903.89 [785.60, 1468.65] |       898.05 [808.61, 1099.26] |

[Follow-up samples](data/2026-09-20-cli-processing/followup.json) retain all 42
command measurements. This did not reproduce a consistent regression in those
paths; it does not establish precise equivalence or a capacity guarantee.

## Startup evaluation and retained behavior

A disposable source-copy experiment removed eager imports of `verify.js` and
`continuity.js` from `cli-commands.js`, loading each only for commands that use
it. Seven alternating fresh-process samples timed importing the runtime module,
excluding Node process startup: baseline median **76.09 ms** [74.05, 92.19],
prototype **57.72 ms** [56.40, 59.31]. This is approximately 18 ms of module-load
savings, not a measured full-command saving or the elimination of all schema
compilation. The experiment used the unmodified base source except for those
deferred imports, with the same installed contributor dependencies.

The prototype changes failure behavior: after removing `state.schema.json` in
each disposable copy, `validate` on the valid museum example exits 1 with the
existing runtime-load diagnostic in the baseline, but exits 0 in the prototype.
The [raw follow-up record](data/2026-09-20-cli-processing/followup.json) includes
these outcomes. The prototype is not adopted. Retaining eager schema preparation
preserves the current load-failure behavior and keeps this optimization focused.
Generated validators were not introduced; their build/drift/diagnostic work is
not justified merely by this bounded startup observation. This evaluation is
complete without claiming a startup improvement in the product.

## Correctness and local checks

- All **52** input/setup artifact fingerprints match between implementations,
  including drafts, choices, saved state, change summaries and HTML.
- Each implementation passed **33** timed output comparisons and **five** full
  four-part `verify-run` receipts: steady 1,000/10,000/50,000 and reviewed churn
  1,000/10,000. Every explicit user classification and target survives. Churn
  removes/replaces 10% of identities and resolves 200/2,000 pending issues only
  after explicit choices. The initial seed map is authored and remembered;
  these timings do not measure large `classify-draft` runs.
- Three focused tests protect source-qualified identity collisions, reversed
  memory/choice order, absent entries, duplicate rejection before indexing,
  caller-input preservation after failed choices, and exact diagnostic order
  around the first of multiple disjoint parent cycles.
- `just init` passed. `just ci` passed **87/87 Node tests**, zero skips, plus
  documentation, eight diagram sets, formatting, lint and bundle currency.
- `just browser-check` passed **48/48 Chromium tests**, zero skips. The first
  sandboxed launch was blocked by macOS process permissions; the same command
  passed outside that sandbox. No new perceptual review was performed; the
  viewer and diagrams are unchanged.
- Harness negative controls reject an existing output without changing its
  results, a changed expected artifact hash, and a mismatched fixture protocol
  before output creation.

Hosted CI and review/integration are recorded with the delivery PR. No live
source access, real skills installer, fresh-host discovery, Windows execution,
Go/Rust full-contract comparison, release promotion or runtime acceptance was
performed. Neither these synthetic timings nor earlier reduced mocks establish
native-language migration gains.
