# Synthetic examples

[museum.json](museum.json) describes an invented exhibition with multiple
purpose groups, cross-cutting targets, registered relations, completed work,
and known/unknown context. [seed-library.json](seed-library.json) uses another
owner, taxonomy, and count distribution with no attachments. The museum renders
as **Mira의 Stellar** with Korean UI; the seed library renders as **Rowan’s Stellar**
with English UI. These scenario names describe fixture content, not viewer titles.

Both datasets were authored from scratch. Neither is an anonymized or renamed
copy of real work. Generate them using the same renderer without viewer edits:

```sh
just render examples/museum.json outputs/museum.html
just render examples/seed-library.json outputs/seed-library.html
```

[mixed-capture.json](mixed-capture.json) is a separate invented observatory
scenario with Linear and two GitHub repositories, repeated `#7` identifiers,
and a registered cross-repository dependency. It is native capture input:

```sh
just normalize examples/mixed-capture.json outputs/mixed-draft.json
just classify-draft outputs/mixed-draft.json examples/mixed-choices.json outputs/mixed-run
just render outputs/mixed-run/work-map.json outputs/mixed-run/stellar.html
```

The draft intentionally requires agent classification before validation/rendering.
[mixed-choices.json](mixed-choices.json) supplies one authored interpretation for
this example, keyed by canonical issue IDs to distinguish repeated `#7` labels.
The first-run command applies it and saves matching refresh state. Tests execute
the capture/choices pair and verify facts, ownership, rendering and later refresh.
Use fresh output run paths when repeating the example. Its taxonomy is not a
required vocabulary for other datasets.

[purpose-capture.json](purpose-capture.json) is an independently invented river
station input for skill exercises. It contains different harness purposes,
numerical production and explanation work, delivery maintenance across tools,
and unqueried context. Ask the skill to create a map from this capture without
giving it an expected taxonomy. Review the resulting inclusion bases against
each issue's outputs and exclusions; category names or counts are not fixed
answers. The synthetic capture itself requires classification before rendering.
The Node gate checks its normalization and documented issue/relation counts;
semantic membership remains a separate review of the agent's interpretation.

Real snapshots and every data-bearing derivative (JSON, HTML, SVG, screenshots,
logs) belong only in ignored `local/` and `outputs/` or outside the repository.
Never run private inputs in public CI. Inspect staged paths and contents before
committing; `.gitignore` alone is not a data disclosure check.
