# Generate a first report

Read [collection and retention](collection.md), [capture format](capture.md),
[classification](classification.md), [progressive reading](reading.md), and
[shared state rules](continuity.md) and [choices](choices.md). Shared run preparation and final
delivery are in [runs](runs.md), already required by the skill entry.

For a supplied native capture, preserve its bytes and original timestamps;
no live provider lookup is implied. For live input, read only the provider guide
selected by collection guidance. Keep each workspace/repository separate, carry
obtained context bodies into records, and preserve explicit relation endpoints.
Build the capture in a private staging directory; keep the final run path unused.
If a canonical draft is already supplied, retain it and available matching
evidence, then continue at classification without normalizing it as a capture.
If its capture is missing, disclose the verification limit through recovery.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" normalize "$STAGING/capture.json" "$STAGING/draft.json"
```

The result has source facts and registered relations but no classifications.
`needsClassification` is expected; do not render an assigned unclassified draft.
Read enough evidence to establish purposes, deliverables and exclusions, expanding
when later text may contradict a preview. Review every group's membership against
its basis, preserving user authority and original source text.

For a directly authored map from another provider, read the
[work-map contract](../schemas/README.md) before authoring; do not claim a native
normalizer exists. A supplied complete map without saved state uses
[remember](remember.md). If facts are wrong, correct the capture against evidence,
normalize again, and reapply interpretation; do not patch generated facts.

After normalization and evidence reading, author choices using
[shared choices and authority](choices.md).
See [complete synthetic choices](../examples/mixed-choices.json) only when an
additional example is useful.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" classify-draft "$STAGING/draft.json" "$STAGING/choices.json" "$OUT/classified-01"
```

The runner applies authored decisions; it does not infer purposes or propose
groups. It reuses the same choices validation and user-authority protections as
`classify`. Existing groups cannot be redefined by agent choices, and existing
user classifications/targets cannot be overwritten. For a partially interpreted
first map, classification origin also supplies initial target ownership, as with
[remember](remember.md). Context can remain unclassified. Missing assigned
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

If the user supplied explicit grouping instructions, record those through
[revise](revise.md) on the new state in another fresh run before delivery.
Finish using [verification and delivery](runs.md#check-the-final-artifacts),
including validation, rendering, evidence retention and the actual state path.
