# Retained standalone experiment evidence

The [interpretation](../../2026-09-21-standalone-normalize-comparison.md) separates
the original temporary-directory measurements from the later archival replay.

| File | Meaning |
| --- | --- |
| `benchmark.json` | Original 72 raw invocation rows: 12 warmups and 60 measured trials. |
| `summary.json` | Original twelve median/min/max summaries; checked against the raw rows. |
| `environment.json` | Original tool/OS versions, input identities and unavailable hardware/RAM observations. |
| `artifacts.json` | Original source, dependency, executable and harness fingerprints. Some artifacts deliberately remain local. |
| `baseline-identity.json` | Original product revision and reference-file hashes. |
| `correctness.json` | Projection of the final 169-case receipt, retaining all fields except diagnostic stderr. |
| `safety.json` | Projection of 22 storage/standalone receipts, retaining all fields except stderr. |
| `archive-provenance.json` | Hashes of original files and explicit archive transformations/omissions. |

The first five files retain their exact original bytes. Correctness and safety
projections omit diagnostic stderr to avoid publishing machine paths and verbose
logs. They preserve case identities, input SHA-256, exit codes, acceptance/output/
summary comparisons and output/input preservation outcomes. They do not claim
exact diagnostic equivalence or provide the raw console transcript.

`artifacts.json` describes the measured temporary layout. Paths beginning with
`baseline/` refer to the pinned product copy; `bin/` binaries are not committed.
Native sources and locks are retained exactly under
[the prototype directory](../../../../scripts/bench/standalone/README.md).
The original report generator and host-specific setup script are not included;
the portable replay adapter and this documentation replace their invocation role.
An original hash is historical evidence, not a promise that every named file
exists in the current repository or that new binaries have identical hashes.

Run `just standalone-check` to check source/lock and retained raw-data identity,
sample order, calculated summaries and receipt consistency. Re-execution uses
`just standalone-replay` and writes separate results. Neither command modifies
this historical dataset.
