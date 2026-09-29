# Batch reader preparation memory

Date: 2026-09-29

State: **As-built**

## Scope and behavior

[Issue #50](https://github.com/weirdry/stellar/issues/50) follows the
[batch reading record](2026-09-28-batch-reading.md). `read-batch` previously
retained a code-point array for every issue selected anywhere in the plan, and
block texts for every issue with a block request, until the returned page was
built. Pagination limited the output but not this preparation.

[reading.ts](../../lib/reading.ts) now validates the whole plan with each issue's
code-point length and block boundaries only. Code points are counted without
allocating one string per character; lone surrogates count as one code point,
matching the individual readers. Only issues on the returned page are expanded
to code-point text, once per issue, and repeated selections on that page share
it. The request and response contract, first-invalid-request diagnostics,
identity resolution, ordering, metadata references and both continuation
mechanisms are unchanged; no cache survives the invocation and inputs are not
modified. Individual readers keep their results; metadata and block offsets use
the same allocation-free count.

## Regression evidence

[Batch reader regressions](../../test/reading-batch.test.ts) add a multi-page plan
that revisits issues on later pages, with astral, combining and lone-surrogate
text and empty, null and missing descriptions. Every item and metadata entry
equals the corresponding `read-body`/`read-issue` result, and block boundaries
and lengths equal `Array.from` counts. Off-page body and block offsets are
accepted at their exact code-point end and rejected one position later, where a
UTF-16 length would still accept them; the first invalid request is reported on
page 0 and page 20. Returning UTF-16 lengths from the count makes these tests fail.

## Reproducible comparison

```sh
just batch-memory-benchmark NEW_DIRECTORY 15306a63458e2044eb64af840d6474f04e4b8b4a 5 2000
```

The [harness](../../scripts/bench/batch-memory.ts) extracts the baseline runtime
listed in that revision's integrity manifest from Git, stages the checked current
bundle, and runs both in alternating order with one warmup and five measured
trials. Each fresh Node process uses the existing system-time protocol. Every
stdout must equal the individual-reader expansion before it is accepted.

The invented map has 2,000 Linear issues and no relations. Each body repeats a
heading, a paragraph with astral, CJK and combining text, a list and a code fence.
Bodies embed their issue number, so they have 5,198–5,450 code points (13.2 MB
serialized map) or 52,090–54,610 (125.2 MB). Plans are a one-request control, 45
mixed body/block/continuation requests over 15 issues, one body request per
issue, and 10,000 requests repeating body, continuation and block selections of
every issue. The first and last pages are measured. `read-body` of one issue is
a second control.

The harness rejects an unavailable baseline revision, an incomplete or mismatched
baseline runtime, or fewer than 40 issues with a usage error (exit 2) before
creating its output directory, so the same path can be retried. The
[preflight regression](../../test/batch-memory.test.ts) covers these cases in a
repository without the baseline history.

Measured on macOS 27.0.1 (Darwin 27.0.0), Apple M3 Max, 48 GiB, arm64,
Node 24.19.0, with warm caches and no exclusive host reservation. Values are
medians across five trials; the [receipt](data/2026-09-29-batch-reader-memory/results.json)
holds all samples, the harness hash and both runner hashes. The candidate hash
equals the delivered runner. Last pages are within 15 MiB and 20 ms of page 0.
Two earlier runs with preliminary harness revisions showed the same pattern;
their receipts are not committed.

| Map   | Plan (page 0)                 | Peak RSS MiB before → after | Wall ms before → after | CPU ms before → after |
| ----- | ----------------------------- | --------------------------: | ---------------------: | --------------------: |
| small | `read-body`, one issue        |               166.0 → 165.4 |              133 → 136 |             170 → 180 |
| small | 1 request                     |               165.9 → 162.5 |              134 → 136 |             170 → 170 |
| small | 45 requests, 15 issues        |               165.6 → 164.8 |              140 → 136 |             180 → 180 |
| small | 2,000 bodies                  |               306.0 → 166.2 |              196 → 167 |             250 → 210 |
| small | 10,000 repeated bodies/blocks |               356.6 → 186.5 |              311 → 252 |             410 → 300 |
| large | `read-body`, one issue        |               799.5 → 799.8 |              394 → 392 |             440 → 440 |
| large | 1 request                     |               799.3 → 799.7 |              389 → 390 |             440 → 440 |
| large | 45 requests, 15 issues        |               867.6 → 860.8 |              420 → 419 |             490 → 490 |
| large | 2,000 bodies                  |              1412.5 → 862.6 |              983 → 670 |            1210 → 730 |
| large | 10,000 repeated bodies/blocks |              1742.8 → 914.4 |            1991 → 1428 |           2740 → 1530 |

The one-request and `read-body` controls are whole-process observations, about
163–166 and 799 MiB, and are unchanged. They include input reading, JSON parsing,
map validation, one request and Node startup; they approximate that fixed cost
rather than isolating parsing or validation. Measured above the one-request
control, the large whole-body plan fell from about 613 to 63 MiB and the repeated
plan from about 944 to 115 MiB. The remainder includes the request plan, the
returned page's text, output serialization and transient block-scan allocation
awaiting garbage collection; this split is an inference, not a heap attribution.
Peak memory is not constant: it grows with the map, the plan and the returned
page's bodies.

Time also fell for whole-plan workloads because off-page issues are no longer
expanded to arrays. Each returned issue is now counted and then expanded, one
extra allocation-free scan bounded by the page. The 45-request plans show no
measurable change; their measured pages contain seven distinct large issues
(page 0) and two (page 40). Repeated
selections share one expansion per page. Every page invocation still validates
the whole plan, as before.

## Limits

These are synthetic single-host observations, not production sizing, capacity or
latency guarantees, and no threshold is introduced. Linux, other Node versions,
real bodies and very large single descriptions were not measured. The harness
retains maps and per-trial outputs in its local output directory; only the
receipt is committed. Hosted CI, browser review, release, installation and
live-source validation are separate.
