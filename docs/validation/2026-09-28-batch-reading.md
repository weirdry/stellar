# Batched evidence reading

Date: 2026-09-28

State: **As-built**

## Scope and behavior

[Issue #46](https://github.com/weirdry/stellar/issues/46) adds
`read-batch MAP.json REQUESTS.json [OFFSET]` to the TypeScript reader. Explicit
body/block requests share one map read, parse and validation per invocation,
indexed identity lookup, per-issue code-point/block preparation, and metadata/hash
emission once per issue in the returned page. Individual reader commands and
capture/map/state contracts remain unchanged. Development identity remains
`0.1.4-dev.0`; no release or migration is performed.

The [reading guide](../../references/reading.md#batch-selected-evidence) owns the
request/response contract. Up to 20 requests are returned, each with up to 4,000
code points. Top-level continuation pages the request list; item continuation
expands that body or block. Page-local metadata indices resolve to canonical IDs
and description hashes. All requests are validated before output, including
later pages; invalid requests produce indexed diagnostics with no partial stdout.
Maps and request plans must remain unchanged while paging; no persistent cache
or snapshot locking is introduced.

## Regression and workflow evidence

[Batch reader regressions](../../test/reading-batch.test.ts) compare expanded batch
results with existing individual results, including multiple pages, repeated
requests, Unicode/CRLF boundaries, lone surrogates, empty observations, invalid
requests on later pages, colliding source identifiers, and changed descriptions
between invocations. Source and bundled CLIs return identical pages and preserve
input files. Diagnostics do not echo private selectors, unknown field names,
malformed payload fragments or inaccessible request paths.

The skill entry validator passed. An explicit revised-workflow invocation retained
and normalized the invented `mixed-capture.json`, read all four assigned short
bodies with one batch, reviewed their titles/body evidence, and applied the
existing authored `mixed-choices.json`. The two GitHub `#7` identifiers remained
source-qualified; one context issue and three relations remained intact.
`classify-draft`, `validate`, `render` and `verify-run` passed: capture facts,
embedded map, bundled viewer and saved-state/map correspondence all matched.
This is an author-reviewed synthetic example, not independent classification QA
or automatic host discovery. Its files remain in an ignored local output folder.

Required complete local and hosted gate results are recorded against the final
PR head. The viewer and its input contract are unchanged; no new local browser
or visual acceptance is claimed. Hosted browser regression is separate.

## Reproducible comparison

Run `just batch-reading-benchmark NEW_DIRECTORY 5`. The
[comparison script](../../scripts/bench/batch-reading.ts) generates its invented
five-issue map from the public mixed capture and compares identical requested
evidence through individual commands and the bundled batch CLI. Each subprocess
output is checked against complete individual-reader results, including metadata,
text, offsets and continuation, before its measurement is accepted.

The selected-block scenario requests blocks 0, 1 and 3 from three issues. The
other scenario reads each of the five short bodies once. One warmup per mode
precedes five measured trials in alternating order. Fresh Node processes run
sequentially with warm caches. The existing system-time backend records wall,
CPU and peak RSS; the single-command sequence sums wall/CPU and uses its maximum
process RSS, not a sum. No exclusive host reservation or tail-latency claim is
made. This small workload primarily demonstrates avoiding repeated CLI startup
and map processing, not large-map throughput or a language comparison.

Output sizes count actual pretty-printed JSON stdout, including final newlines.
They exclude request-plan authoring, tool wrappers, tool arguments and host/model
transport. CLI process counts are not necessarily model round trips. Bytes,
wall time and CPU are not token telemetry; no input/output/cached-token billing
measurement or arbitrary timing gate is introduced.

The final observations and limitations appear below; full raw outputs/resource
files stay local. The committed receipt contains only synthetic metadata and
measurements, with map, request, reader and runner hashes for identity.

Measured on macOS (Darwin 25.5.0), arm64, Node 24.19.0. Values below are
medians across five measured trials. [Full receipt](data/2026-09-28-batch-reading/results.json).

| Scenario / mode                    | CLI calls | Output bytes | Wall ms | CPU ms | Peak RSS MiB |
| ---------------------------------- | --------: | -----------: | ------: | -----: | -----------: |
| selective-blocks / individual      |         9 |        5,592 |   890.7 |   1080 |         78.8 |
| selective-blocks / batch           |         1 |        3,636 |    96.3 |    120 |         78.7 |
| distinct-short-bodies / individual |         5 |        3,340 |   466.1 |    570 |         78.5 |
| distinct-short-bodies / batch      |         1 |        3,942 |    90.8 |    110 |         78.2 |

Shared metadata reduces the selective-block response from 5,592 to 3,636 bytes
(35.0%). Distinct short bodies grow from 3,340 to 3,942 bytes (18.0%): there is no
repeated metadata to remove and the batch envelope adds overhead. Both scenarios
use fewer CLI processes, but that does not guarantee fewer host/model calls or
lower billed tokens. Prefer individual direct reads for isolated short bodies;
use batching where shared evidence or avoided repeated processing is useful.
Full evidence and explicit expansion remain available in either route.

The successful measurements use the same reader/runner hashes as the delivered
implementation. An initial sandboxed resource measurement could not query macOS
system-time resources and was not used; the final measurements ran separately
from repository lint/type checks. No live sources or private reports were used.
