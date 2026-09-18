# Remember, revise and refresh

Use this workflow to remember a user's grouping or refresh an earlier map. State
is private and retains decisions for issues missing from later queries. Only the
current work map is sent to the viewer.

Select the destination using the [run location policy](runs.md#choose-the-run-location).
An input state's location alone is not an output-directory preference. Keep that
state in place and pass an absolute, unused run path to the continuity command.

## Classify a first draft

After normalization and evidence reading, author a choices file using the
[choices contract](../schemas/choices.schema.json) and the example below.
Use each draft issue's canonical `id` as `issueId`, not its display identifier.
Domains/categories define the taxonomy; issue choices carry classification
and/or targets. Do not supply source fields or `origin`: the command sets agent
origin. See [the complete synthetic choices](../examples/mixed-choices.json).

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" classify-draft "$STAGING/draft.json" "$STAGING/choices.json" "$OUT/classified-01"
node "$STELLAR_ROOT/bin/stellar.mjs" render "$OUT/classified-01/work-map.json" "$OUT/classified-01/stellar.html"
```

The runner applies authored decisions; it does not infer purposes or propose
groups. It reuses the same choices validation and user-authority protections as
`classify`. Existing groups cannot be redefined by agent choices, and existing
user classifications/targets cannot be overwritten. For a partially interpreted
first map, classification origin also supplies initial target ownership, as with
`remember` below. Context can remain unclassified. Missing assigned
classifications or invalid decisions are rejected before a directory is created.
For a missing classification, `input: "work-map"` and `/issues/N/classification`
identify the issue in the draft, not the Nth choices entry. Add a choice using
that draft issue's canonical `id` as `issueId`, with `category` and `rationale`
inside `classification`; omit `origin`, which the runner assigns.

Successful application writes a complete `work-map.json`, matching `state.json`,
and empty initial `changes.json`. Keep the original draft and choices; retain
the input capture and applied choices with the final run. No extra `remember`
step or custom map-mutation script is needed.
If there are no assigned issues and no decisions to apply, validate the draft
and use `remember` instead; the choices contract requires a nonempty update.

This is a first-run entry point. When state already exists, use `classify` with
that state: extracting its map for `classify-draft` would discard absent
identities, pending review and independent target ownership.

## Start from a completed map

For an already-complete standalone map without saved state, bootstrap its state:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" remember "$MAP/work-map.json" "$OUT/saved-01"
```

`classify-draft` and each continuity command create a **new directory** containing `state.json`,
`work-map.json`, and `changes.json`. Supply an unused path; do not create the
run directory in advance. Existing files, directories and symlinks are refused.
Use the latest successful `state.json` for the next operation. Branches of saved
state are not automatically reconciled. Subsequent runs use state, not another
`remember` of a rendered map, which would drop absent decisions.

JSON syntax and continuity-schema diagnostics identify the input role in `input`
(`state`, `capture`, `choices`, or `work-map` for syntax), with a document-relative
JSON pointer and repair guidance. A choices file needs at least one nonempty
domains/categories/issues array; an issue choice needs classification, targets,
or both. Output failures use `/run` to identify the run-directory argument.
Choose a fresh writable path while keeping earlier runs. If cleanup reports
leftovers, inspect that failed directory and do not use it as saved state.
Input read failures, such as a missing file, still use system error messages that
may include the supplied path. Check the input path and read access before
attempting to repair its JSON contents.

When bootstrapping an existing map, classification origin also sets initial
ownership of targets because the map has no separate target-origin field.
`revise` records independent target choices, including an intentionally empty list.

Continuity runs support HTTP(S) document references and retain them during
refresh. Report-relative references are refused before writing because a new
run does not include their files. Keep the original map/state and its reference
files intact. Use the standalone renderer beside those files when local
references are required, or use verified web links when available. Do not drop
references or upload private documents just to pass validation. Local reference
bundling is not implemented.

## Apply a user's correction

Resolve the requested issue using the current map and source provenance. Write
only the requested changes using [the choices schema](../schemas/choices.schema.json):

```json
{
  "categories": [
    {
      "id": "research-tools",
      "domain": "research",
      "label": "Research tooling",
      "basis": "Reusable capabilities shared by research tracks"
    }
  ],
  "issues": [
    {
      "issueId": "the-internal-id-from-this-map",
      "classification": {
        "category": "research-tools",
        "rationale": "The user explicitly placed this reusable tool here."
      },
      "targets": ["Shared tooling"]
    }
  ]
}
```

Use actual IDs and domains; these are illustrative names. Omitted classification
or targets stay unchanged. Domains/categories are upserted by ID. Changing a
group definition affects all remembered issues using it, including absent ones.
There is no deletion, history pruning or identity-rebinding operation.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" revise "$PREVIOUS/state.json" "$USER_CHOICES" "$OUT/revised-02"
node "$STELLAR_ROOT/bin/stellar.mjs" render "$OUT/revised-02/work-map.json" "$OUT/revised-02/stellar.html"
```

`revise` marks supplied issue fields as user choices. Use it only for an explicit
user correction, never to bypass rejection of an agent suggestion. Ordinary agent
decisions use `classify`, which cannot overwrite user classifications/targets or
redefine existing groups. Taxonomy text is retained verbatim across UI locale
changes; translate existing names only when requested by the user.

## Refresh on request

Collect a new native capture through the read-only source guides, resolving the
requested scope again. Viewer filters are not collection instructions.

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
stays in memory for context. A status change alone does not trigger regrouping.
Null and omitted descriptions are equivalent for this comparison; source fields
remain as observed. Empty strings and other actual text remain distinct.
Unqueried observations do not replace full-text evidence. Pending assigned
classifications block rendering. This is a text-change heuristic, not a semantic
judgment by the runner.

Compare the complete previous/current evidence mechanically and read the changed
text with enough surrounding context before accepting a purpose change. The
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

Write agent decisions in the same choices format:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" classify "$OUT/refreshed-03/state.json" "$AGENT_CHOICES" "$OUT/classified-04"
node "$STELLAR_ROOT/bin/stellar.mjs" validate "$OUT/classified-04/work-map.json"
node "$STELLAR_ROOT/bin/stellar.mjs" render "$OUT/classified-04/work-map.json" "$OUT/classified-04/stellar.html"
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
