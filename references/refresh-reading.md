# Read focused refresh evidence

Keep the **previous** saved state and the retained fresh capture. `read-refresh`
uses the same `refreshState` policy in memory; it does not write a run, resolve
reviews, replace user choices or modify either input. Use those same inputs for
`refresh`. Reading after creating a refreshed run still requires the original
previous state: user evidence is advanced during refresh, so the new state alone
cannot reconstruct the earlier observation. This command does not compare two
saved states or accept a normalized work map in place of a capture.

```sh
# Attention index, then its next page if nextOffset is non-null:
node "$STELLAR_ROOT/bin/stellar.mjs" read-refresh "$PREVIOUS/state.json" "$CAPTURE"
node "$STELLAR_ROOT/bin/stellar.mjs" read-refresh "$PREVIOUS/state.json" "$CAPTURE" "" focus 20
# Select a canonical ID from that index:
node "$STELLAR_ROOT/bin/stellar.mjs" read-refresh "$PREVIOUS/state.json" "$CAPTURE" ISSUE_ID
node "$STELLAR_ROOT/bin/stellar.mjs" read-refresh "$PREVIOUS/state.json" "$CAPTURE" ISSUE_ID full
# Read available category inclusion criteria, especially for a new issue:
node "$STELLAR_ROOT/bin/stellar.mjs" read-refresh "$PREVIOUS/state.json" "$CAPTURE" "" taxonomy
```

The index contains `pending-classification` entries with the authoritative
`reviewReason`, plus `preserved-user-evidence-changed` entries for changed full
observations under user classifications. The latter are **not** pending agent
classification: report the tension and retain the user's decision.
`preserved-user-evidence-available` instead means a full observation is now
available under a user decision with no retained baseline. Inspect the new
evidence while preserving the decision; this label does not assert a change.
Unchanged and status-only classified issues do not enter the index unless an unresolved review
already exists. Identity-uncertain entries never borrow a previous decision by
visible identifier. Absent issues remain in saved memory and are not current
reading candidates. Unqueried context cannot establish changed purpose; a pending
context review remains listed with current evidence marked unavailable.

Select by canonical issue ID or an unambiguous display identifier. The evidence
response supplies source-qualified identity, current source coverage/timestamp,
status/detail, previous classification/rationale and target ownership, and the
previous category's inclusion basis/domain when one exists. `taxonomy` pages all
current saved categories and their domain descriptions for considering alternatives;
there is no automatic category selection or semantic ranking. Existing map readers
remain available for current observations outside the attention index.

Baseline provenance is explicit:

- `previous-full-observation`: for a user classification, the exact previous
  map observation is preferred when full detail exists, retaining null/omitted
  distinctions. It is the latest observed text, not necessarily the text from
  when the user originally made the decision.
- `saved-decision-evidence`: retained memory evidence for an existing
  classification supplies the baseline, including across repeated pending reviews
  and temporary absence.
  This evidence may predate the previous map. The existing saved format does not
  retain its acquisition timestamp and may omit an originally null description;
  `presence: omitted` describes this retained record, not proof of a source omission.
- `saved-observation`: retained memory evidence without a classification, such
  as the first sighting of a still-pending new issue. This is an observation,
  not evidence supporting a saved classification. It has the same timestamp and
  null-presence limitations as other saved memory evidence.
- `unavailable`: no baseline or no current full observation exists. Missing
  evidence is never represented as a known empty observation. New/unclassified
  issues include all available text in focus mode, with continuation as needed.

Each title/description field reports `changed`, side-specific availability,
recorded presence, code-point length, exact selected range, omitted ranges and a
hash. `changed` is `null` (unknown) when either observation is unavailable;
available text is still emitted. Otherwise it is a boolean. Comparisons against
saved memory treat null and omitted descriptions as equivalent because that
format collapses them; an empty string remains distinct. Comparing two full
user observations retains exact null/omitted differences. Presence and hashes
always describe the exact retained representations, even when comparison treats
them as equivalent. The hash is SHA-256 of UTF-8
`JSON.stringify({ field, value })`, omitting `value` when the retained field is
absent; unavailable evidence has null hash.
It identifies that retained field representation, not semantic meaning or a
snapshot of the whole source. Description null/omitted equivalence in the existing
classification policy is unchanged; the reader can still disclose exact recorded
presence differences for user observations.

`focus` finds an exact common code-point prefix and suffix for each field and
includes the intervening change plus up to 160 code points of context on each
side. It does not use heading vocabulary, line-based assumptions or normalization.
Multiple distant edits retain the whole middle; a completely changed unheaded
body may have no reduction. Identical fields are omitted explicitly. A text
reversion can produce no focused chunks while the review remains pending: use
`full` to inspect the complete baseline and current evidence before deciding.
This is a mechanical text window, not proof that omitted text is irrelevant.
Expand whenever inclusion, exclusions, links or later contradictory evidence
cannot be assessed from the focused window.

`items` are exact chunks in title-before, title-after, description-before,
description-after order, with `field`, `side`, `start`, `end` and `text`. Offsets
are Unicode code points relative to the complete retained field, preserving CRLF,
combining marks and surrogate contents. Each chunk contains at most 4,000 code
points. `total`, `offset` and `nextOffset` page these chunks (or index/taxonomy
entries), up to 20 at a time. Continue using the same issue and view. Switching to
`full` starts at offset 0; page offsets do not transfer between views. Empty views
and end-of-list offsets return empty arrays with null continuation. Null
continuation completes the selected view, not omitted context or semantic review.
Decision/category/source metadata is retained verbatim and is not a token bound.

Keep both inputs fixed while paging. Re-read from offset 0 after either changes;
there is no persistent cache, snapshot lock or stale-input detection. File/JSON
errors identify `/state` or `/capture` without copying paths or payload fragments;
selection/view/offset failures have actionable diagnostics and no partial stdout.
Existing state/capture validation still applies. Every invocation validates and
computes refresh in memory; pagination limits output, not total input processing
or memory use. Source observations, relations and saved choices remain intact.
