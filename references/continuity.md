# Remember, revise and refresh

Use this workflow to remember a user's grouping or refresh an earlier map. State
is private and retains decisions for issues missing from later queries. Only the
current work map is sent to the viewer.

## Start from a completed map

Classify a first map through the ordinary workflow, then bootstrap its state:

```sh
just remember "$MAP/work-map.json" "$OUT/saved-01"
```

Each continuity command creates a **new directory** containing `state.json`,
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
just revise "$PREVIOUS/state.json" "$USER_CHOICES" "$OUT/revised-02"
just render "$OUT/revised-02/work-map.json" "$OUT/revised-02/stellar.html"
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
just refresh "$PREVIOUS/state.json" "$CAPTURE" "$OUT/refreshed-03"
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
just classify "$OUT/refreshed-03/state.json" "$AGENT_CHOICES" "$OUT/classified-04"
just validate "$OUT/classified-04/work-map.json"
just render "$OUT/classified-04/work-map.json" "$OUT/classified-04/stellar.html"
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
