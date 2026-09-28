# Shared saved-state and choices rules

Read this when using `classify-draft`, `remember`, `refresh`, `classify` or
`revise`. Operation-specific steps live in the linked routes below; read only
the route selected in [SKILL.md](../SKILL.md).

## State and run boundaries

These commands create a fresh unused directory containing `work-map.json`,
`state.json` and `changes.json`. Let the command create it; existing files,
directories and symlinks are refused. Use the [run location policy](runs.md#choose-the-run-location).
Keep prior inputs and successful runs. State retains decisions for absent issues;
only its emitted current work map enters the viewer.

Use the selected latest successful state for the next operation. Branches of
state are not reconciled automatically. Never extract a map for another
`remember` or `classify-draft` when state exists: that discards absent identities,
pending reviews and independent target ownership. Do not edit state or patch
the generated map by hand. For a different person, use a separate state.

Continuity accepts HTTP(S) document references. Report-relative references are
refused before writing because new runs do not contain their files. Preserve
the original and follow [local-reference recovery](recovery.md#local-document-references);
do not remove links or upload documents to make validation pass.
Failed or incomplete runs are not saved state; follow
[run failure recovery](recovery.md#failed-or-incomplete-runs) before continuing.

## Choices and authority

Before authoring decisions, read [the shared choices contract](choices.md).
Remembering an unchanged completed map does not require choices.

## Classify a first draft

Follow [first generation](first-report.md) after normalizing and reading evidence.

## Start from a completed map

Follow [remember a completed map](remember.md) only when no saved state exists.

## Apply a user's correction

Follow [explicit user correction](revise.md) for requested grouping or target changes.

## Refresh on request

Follow [refresh](refresh.md) with the previous state and fresh capture.

## Read focused refresh evidence

Read [the focused reader contract](refresh-reading.md) before using `read-refresh`.
