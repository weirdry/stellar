# Synthetic examples

[museum.json](museum.json) describes an invented exhibition with multiple
purpose groups, cross-cutting targets, registered relations, completed work,
and known/unknown context. [seed-library.json](seed-library.json) uses another
owner, taxonomy, and count distribution with no attachments.

Both datasets were authored from scratch. Neither is an anonymized or renamed
copy of real work. Generate them using the same renderer without viewer edits:

```sh
just render examples/museum.json outputs/museum.html
just render examples/seed-library.json outputs/seed-library.html
```

Real snapshots and every data-bearing derivative (JSON, HTML, SVG, screenshots,
logs) belong only in ignored `local/` and `outputs/` or outside the repository.
Never run private inputs in public CI. Inspect staged paths and contents before
committing; `.gitignore` alone is not a data disclosure check.
