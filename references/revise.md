# Apply an explicit user correction

Resolve the requested issue using the current map and source provenance. Read
[shared state rules](continuity.md) and [choices](choices.md). Write only the requested changes.
If assessing new group boundaries, also read [classification](classification.md);
explicit user membership remains authoritative.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" revise "$PREVIOUS/state.json" "$USER_CHOICES" "$OUT/revised-02"
```

`revise` marks supplied issue fields as user choices. Use it only for an explicit
user correction, never to bypass rejection of an agent suggestion. Ordinary agent
decisions use `classify`, which cannot overwrite user classifications/targets or
redefine existing groups. Taxonomy text is retained verbatim across UI locale
changes; translate existing names only when requested by the user.

Use the selected current saved state. If only a completed map exists, first
[remember it](remember.md); do not rebuild state when it already exists.
Retain the applied choices and unchanged capture/evidence from the selected run.
No new source collection is needed for a grouping or target correction.
Finish through [verification and delivery](runs.md#check-the-final-artifacts),
checking the resulting state against the requested changes and preserving all
unrequested fields and source facts. Disclose pre-existing pending reviews;
resolve agent decisions through [refresh review guidance](refresh.md) only when
needed, never through an invented user correction.
