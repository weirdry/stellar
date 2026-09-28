# Remember a completed map

Read [shared state rules](continuity.md). Use this route only for a completed
standalone map without saved state. If state exists, continue from it through
[refresh](refresh.md) or [revise](revise.md), preserving absent decisions and
independent target ownership. This operation performs no collection or regrouping.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" validate "$MAP/work-map.json"
node "$STELLAR_ROOT/bin/stellar.mjs" remember "$MAP/work-map.json" "$OUT/saved-01"
```

An empty/context-only map needs no invented classification. Missing assigned
classifications instead require [first classification](first-report.md).
When bootstrapping a map, classification origin supplies initial target ownership
because the map has no separate target-origin field. Explicit target corrections,
including an intentionally empty list, subsequently use `revise`.

Retain the selected original map and available matching capture/evidence without
claiming new collection. Finish with [verification and delivery](runs.md#check-the-final-artifacts)
using the newly emitted map and state. Missing capture or old-renderer evidence
triggers [recovery guidance](recovery.md), not recollection or invented provenance.
