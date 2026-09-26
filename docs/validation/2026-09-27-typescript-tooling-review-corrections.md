# Maintained TypeScript tooling review corrections

Date: 2026-09-27

Scope: five low-severity independent-review findings on PR #40 at
`9e4d93cfe311b3866862e2b6f1c53c08fd769ce2`, plus related documentation
clarifications. The follow-up changes contributor tooling, tests and documents.
Product source, generated runner/viewer/manifest, schemas, dependencies,
diagram artifacts and frozen experiments are unchanged.

## Corrections

- **Local Markdown links:** extraction stops at line breaks, and joining a
  relative target preserves its trailing slash. An unclosed external link no
  longer hides the next broken local link; an existing file cannot satisfy a
  target ending in `/`. The documentation checker regression covers both cases.
- **Profile attribution:** resolve the benchmark directory's real path before
  constructing the stage URL. Product frames retain `bin/stellar.mjs` when the
  benchmark is reached through a symlink, including macOS `/tmp`. The CPU unit
  test again checks stage-relative URLs; the executable benchmark test profiles
  a symlinked stage in both CPU and heap modes and checks output parity and labels.
- **Measurement requirements:** benchmark, profile and benchmark-test require
  system time. Hosted CI runs the measurement suite separately from `just ci`;
  system time is not an installed product prerequisite.
- **Measured failures:** diagnostics include the operation tag, observed exit
  status or signal, and the retained stderr path. Synthetic exit-7 and SIGTERM
  cases check the message and retained files. The signal case terminates only
  the test-owned system-time wrapper from its own child.
- **Diagram inspection:** failures include the diagram name and retain the
  underlying error. Missing `meta` and `diagram_type` probes verify both the
  diagnostic and preservation of every diagram input/artifact.

Documentation also identifies the source gate's fixed discovery scopes, ties
the original 98-test evidence to `1242a92`, and makes the native experiment's
historical checkout/baseline requirement explicit in its guide and recipes.

## Local evidence

Environment: macOS arm64, repository-pinned Node 24.19.0.

- `just ci`: 99/99 Node tests, zero skipped; documentation, eight diagram sets,
  formatting, schema declarations, strict type coverage, lint and generated
  artifact currency passed.
- Targeted documentation/diagram tests: 2/2 passed, zero skipped.
- `just benchmark-test`: 6/6 passed, zero skipped. The existing size-100
  baseline/reference exercise now also checks eight profiled output comparisons
  through a symlink, with product frame labels present in CPU and heap summaries.
- `just profile-test`: 7/7 passed, zero skipped; attribution totals, URL labels,
  parsing, shuffle order and artifact-containment checks remain active.
- Five isolated regression mutations failed for their intended reasons:
  multiline-link extraction, trailing-slash removal, unnamed diagram errors,
  unresolved benchmark symlinks and missing measured-command context. Mutation
  copies and raw evidence remained temporary, outside the tracked checkout.
- Runner, viewer and manifest SHA-256 values match the
  [original conversion record](2026-09-27-typescript-maintained-sources.md).

The first sandboxed measurement attempt could not query macOS kernel timing
information. The reported measurement results come from a successful rerun with
that access, not from skipped or substituted accounting. The symlink mutation
used a disposable clone so the benchmark's Git provenance lookup remained valid.

Commit-hook and hosted results are tracked separately in PR #40. No local
browser/visual review, installer, host discovery, live collection, native replay
or release was performed for this contributor-tooling correction. Existing
product evidence retains its original revision and acceptance boundary.
