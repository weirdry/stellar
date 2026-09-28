# Retain collection evidence

Read this before live collection or using a supplied capture. For live sources,
also read only the selected [Linear](linear.md) or [GitHub](github.md) guide;
read both for a mixed live query. Supplied captures require no live provider
guide unless new collection is requested. Build native input using
[capture format](capture.md). Source access remains read-only.

Before live collection, establish a mechanical route from the host's actual
returned object/text or response file to private storage. A host-provided file
can be retained without printing its content:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" retain-response HOST_RESPONSE_FILE NEW_STAGING/evidence/raw/response.json
```

This copies bytes to a fresh owner-only file and returns a byte count/hash, not
the payload. It cannot establish how its input was obtained. With an accessible
return value, host-side code can serialize it directly to a file instead. Parse
MCP wrappers mechanically, retaining the original response alongside extracted
issue data. Prefer a supported route that saves the response before returning
only metadata to the model; see the executable [GitHub CLI recipe](github.md#retain-list-responses-before-model-delivery).
If full results have already entered model context, retention still preserves
evidence but cannot reduce that earlier input. Inspect the actual wrapper rather
than assuming JSON text: some hosts return `structuredContent`, and normalized
connector objects may differ from the native capture contract.
Network-layer byte capture is not required. Do not put credentials
or unrelated transcript material in evidence.

Output failures distinguish an occupied destination (`response-exists`), a
non-directory parent (`response-parent`), and denied permissions
(`response-permission`); other failures use `response-output`. Each includes
repair guidance without echoing the raw filesystem path. Keep existing files
when correcting the destination.

Do not ask the model to re-emit full responses into shell heredocs or authored
JSON as a substitute for this transfer. Comparison with a capture assembled
from the same transcription only proves downstream consistency, not fidelity
to the tool's original response. If the host exposes only model-visible text
and no supported file/object export, disclose that boundary. Use another
already-authorized export or supplied capture when available; otherwise report
the missing capability. Do not repeatedly recollect or reconstruct historical
responses from memory to satisfy an evidence claim. Already saved artifacts
remain useful with their actual provenance stated.

For live collection, retain the relevant native tool responses as they arrive,
including exhausted pages, separately queried relationships and failed lookups.
Keep authentication headers, tokens and unrelated session content out of this
record. Parse wrappers mechanically; preserve descriptions and source fields.
Record the actual query scope, observation start/end, pagination completion,
lookup outcomes and relative response locations in `evidence/collection.json`.
This is a local collection account, not a new capture schema or a source-access
proof produced by the runner. Unknown coverage remains unknown or partial.
Index failed attempts as well as successful retries when their responses are
available; label a narrative failure account as such. Distinguish observed
metadata, obtained descriptions, and never-queried detail. Selective model
reading never authorizes discarding obtained context bodies from the capture.

A requested sample bounds the assigned set, not the size of its context or
descriptions. Keep direct context retrieval purposeful; do not recursively
expand it by default. Record actual scope and retrieval limits. If reporting
workload, separate assigned/context queries, response size, and retries when
known. Observation windows are not provider latency measurements or proof of
model/token efficiency; savings require an appropriately comparable measurement.

For a supplied capture, retain an unchanged input copy and explain that no new
collection occurred. Original raw responses may be unavailable; disclose that
limit rather than fabricating a collection record. Translate author-owned locale
or scope/notes only when requested, retaining the original input separately and
recording those changes. Do not change observed facts or freshness.
