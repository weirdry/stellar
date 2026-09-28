# Refresh a saved map

Read [shared state rules](continuity.md), [choices](choices.md), [collection/retention](collection.md),
[capture format](capture.md), [classification](classification.md), and
[focused refresh reading](refresh-reading.md). Use the general
[progressive reader](reading.md) only when reading observations outside the
attention index or when its body/block tools are useful.

Collect a fresh native capture through the selected read-only source guide, or
retain the supplied capture with its actual freshness and provenance. Resolve
scope again; viewer filters are not collection instructions. Keep the original
previous state for focused reading even after writing the refreshed state.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" refresh "$PREVIOUS/state.json" "$CAPTURE" "$OUT/refreshed-03"
```

Matching uses `(provider, namespace, nativeId)`, independent of report-local IDs.
Titles and visible numbers never establish identity. The runner does not infer
repository moves or bind an old identifier-only record to a new UUID. A different
native identity with the same remembered display identifier is flagged for
review. This may be one real Linear issue first seen as an identifier-only
context and later fetched with a UUID, rather than two distinct pieces of work.
Check the source evidence and disclose the unresolved identity correspondence.
The runner has no rebinding operation: the provisional entry and its choices
remain in memory and `notObserved` on subsequent refreshes; they are not
automatically transferred to the UUID entry. Keep the prior state and resolve
the current entry's classification explicitly, respecting any confirmed user
choice. Do not infer deletion or a second real issue from the two stored entries,
or edit/prune state to hide the limitation. A different owner is rejected; use
a separate state for another person.

Do not suppress an accessible current lookup or discard an observed native ID
to avoid this review. A native/identifier pair in an authoritative source response
is evidence even when the issue is not in the assigned set; a URL or UUID merely
mentioned in prose is not the same evidence. Follow the source guide's bounded
context scope, and distinguish a lookup outside that scope, a failed lookup, and
an unresolved correspondence with saved identity. Describe the actual reason
for missing detail. Identity uncertainty does not authorize state rebinding or
pruning, nor does it make a current source fact unavailable.

Fresh normalization alone supplies source facts, statuses, scope and relations.
Unknown endpoints stay unknown context. Missing issues stay in memory and are
absent from the current map; even complete query coverage is not proof of deletion
or completion. Never fill lookup gaps with stale source facts. The caller selects
an appropriately fresh capture; its per-source timestamps and coverage remain
visible rather than being treated as an atomic snapshot.

Inspect `changes.json`:

- `added`: identities not previously remembered.
- `returned`: remembered identities observed again after absence from the last map.
- `updated`: changes in observed issue fields, not a source activity log.
- `notObserved`: remembered identities missing from this capture, not deletions.
- `review`: currently observed issues with unresolved saved review reasons,
  including context. Absent issues retain their reasons in state memory.
- `preservedUser`: current issues whose user classification was reapplied.

Name the stage when reporting these counts. A refresh may produce review entries
that a later classify run resolves; final `changes.json` reports the remaining
review, not the original workload. Keep the earlier summary separately if useful.
With a recent-N sample, an issue outside the next assigned set may still appear
as context. `notObserved` means absent from the entire new capture; it does not
identify rank changes, reassignment, deletion, completion or an access change.

Read new/changed issues in the context of the existing taxonomy. Reuse groups when
they fit and add a group when evidence warrants it. Check targets as well as
classification. User choices remain authoritative; explain tension with new
facts rather than silently replacing them. Changed full text with an agent
classification withholds that classification until reconsidered; the prior choice
stays in memory for context. For a matched identity, refresh carries remembered
target tags forward even while classification review is pending, regardless of
their user or agent origin. Target-only changes do not clear that review.
A status change alone does not trigger regrouping.
Null and omitted descriptions are equivalent for this comparison; source fields
remain as observed. Empty strings and other actual text remain distinct.
Unqueried observations do not replace full-text evidence. Pending assigned
classifications block rendering. This is a text-change heuristic, not a semantic
judgment by the runner.

Compare the complete previous/current evidence mechanically and read the changed
text with enough surrounding context before accepting a purpose change. Use
[focused refresh reading](refresh-reading.md) with the previous state
and fresh capture, including changed user-owned observations outside `review`. The
[reader](reading.md) helps inspect source text without rewriting it. Source
serialization may add Markdown escapes or replace an attachment's signed URL
without changing the work's intended outcome. Confirm that the particular diff
is representational, including any code, link destination and query semantics;
do not blanket-unescape text or strip URL parameters. If the purpose still fits,
explicitly reapprove the existing agent classification through `classify` with
an evidence-grounded rationale. Keep both observations literal. This review does
not change the runner's conservative text comparison or allow an agent to
overwrite user choices.

An unqueried context may retain a classification from an earlier observation.
When remembered full-text evidence exists, refresh sets the interpretation
notice `classificationEvidence: previous-observation`; the inspector labels that
basis separately from the current unknown detail/status. This is not proof of a
fresh lookup. A current explicit classification removes the notice for that run;
a full-detail refresh also omits it. A later refresh adds it again whenever the
issue is unqueried, classified, and has remembered full-text evidence, including
after reclassification while unqueried. The recorded decision and rationale stay
intact when the notice returns. Target-only changes and an agent's unchanged echo
of a user choice do not clear it. The agent does not author this runner-owned
notice in choices or infer it from unknown status. A first classification of
unqueried context has no notice.

Review reasons belong to remembered source identities, so repeated refreshes,
context-only observations, temporary absence, and report-local ID changes do not
clear them or change `identity-uncertain` into `new-issue`. Inspect pending context
when its detail is available; otherwise leave it unclassified and report the
lookup limit. A context review does not block rendering. A classification supplied
through `classify` or `revise` resolves that review; target-only and taxonomy
changes do not. Even text reverting to its earlier value keeps the pending review
until an explicit decision is recorded.

Write agent decisions in the [shared choices format](choices.md):

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" classify "$OUT/refreshed-03/state.json" "$AGENT_CHOICES" "$OUT/classified-04"
```

If no assigned classifications are pending, the refreshed map can be rendered
with unresolved context reviews disclosed. Do not edit
state or patch the generated work map by hand; the commands keep saved choices
and current output consistent. State and summaries may contain historical work
outside the current query, so pass only `work-map.json` to the viewer.

Deliver links to the new HTML and `state.json`, with a concise account of changes,
not-observed issues, preserved choices, pending reviews and lookup limits. State
is needed for the next run. There is no background sync, source writeback,
account service or automatic disk-file watching.

Finish the selected final stage with [verification and delivery](runs.md#check-the-final-artifacts).
