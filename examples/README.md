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
```

The draft intentionally requires agent classification before validation/rendering.
It is not a ready-to-render canonical example. Tests use this same capture and
explicit synthetic interpretation to verify normalization and mixed navigation.

Real snapshots and every data-bearing derivative (JSON, HTML, SVG, screenshots,
logs) belong only in ignored `local/` and `outputs/` or outside the repository.
Never run private inputs in public CI. Inspect staged paths and contents before
committing; `.gitignore` alone is not a data disclosure check.
