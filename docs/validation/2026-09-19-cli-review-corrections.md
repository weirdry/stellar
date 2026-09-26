# CLI independent-review corrections

Date: 2026-09-19

Scope: the three actionable findings on [PR #24](https://github.com/weirdry/stellar/pull/24)
at `d6f56ae6046026b646a955d3a8965d3e80994537`, tracked by
[issue #23](https://github.com/weirdry/stellar/issues/23). The review base remains
`7a75c3853e95843cefc9656ae1ce9d19106379e5`. These are corrections to the
unreleased `0.1.2-dev.0` candidate; no report/state schema or release changed.

## Changes and evidence

- **Mixed help arguments:** a bare `--help` alongside workflow arguments exits
  `2` before runtime loading or file writes. Source and installed-copy tests use
  valid render, normalize, retention, and continuity inputs and compare filesystem
  snapshots with both absent and existing `--help` destinations. Literal
  `search-issue` text remains supported, including optional pagination. An explicit
  `./--help` path still permits an intentional file operation.
- **Executable guidance:** help, examples, and error pointers use the actual
  Node and entry-file paths with POSIX shell quoting. Tests execute a printed
  usage pointer through `/bin/sh` with an empty environment and an installed
  path containing spaces and a single quote. No PATH launcher is required.
- **Runtime error diagnosis:** the runtime import has its own failure handler.
  Diagnostics preserve the error category and a code location when available,
  with selected filesystem/module error codes. They omit raw exception messages
  and resource excerpts. Tests reproduce a source `ReferenceError` while the
  unchanged bundle passes doctor, and retain an actionable source location and
  explanation of doctor's scope. Malformed JSON and invalid schema content stay
  private in source and installed diagnostics. Multiline messages cannot inject
  a forged code location into the summary.

The [CLI tests](https://github.com/weirdry/stellar/blob/db82ba087d91eedfc39dc731ddc8ca724b2fcc4c/test/cli-diagnostics.test.js) own the regression cases.
[CLI guidance](../../references/cli.md) and the affected architecture chapters
describe the implemented behavior. The CLI guide also names the JSON `message`
and `fix` fields explicitly.

## Artifact identity and checks

| Artifact                    | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `bin/stellar.mjs`           | `a8334d6f16d283a068c1830f0c23f474a80f4ce7503f5a47498ea87e3b1bdf77` |
| `bin/stellar.manifest.json` | `888c161362225cc0d8a679706592232f503d8e46b1479759e68b5dece5b6544c` |

- `just build-runner`: regenerated the bundle and manifest from canonical source.
- `just test`: **82/82 Node tests passed**, zero skips, including five additional
  diagnostic regressions and the existing isolated distribution/continuity replay.
- `just ci`: **82/82 Node tests passed**, zero skips; documentation, all eight
  diagram consistency sets, formatting/lint, repository checks, and generated
  bundle/manifest/notices currency passed.

## Evidence boundaries

The original [CLI validation record](2026-09-19-cli-diagnostics.md) records the
earlier artifact and author-guided skill replay. Its hashes identify that earlier
candidate; the table above identifies this correction. `SKILL.md` is unchanged.

The original [hosted CI run 35407570262](https://github.com/weirdry/stellar/actions/runs/35407570262)
checked out PR merge commit `8928761de03cabd76b98b87bf681582d71c39639`.
Its tree, `47aa9057a43a03d0f76346c3dabf985ca3a3f6c8`, is identical to the original
head `d6f56ae`. That run does not validate the later correction; the PR and issue
track subsequent hosted results separately.

All corruption/reproduction tests use disposable synthetic copies. No maintainer
skill, private report, saved state, or host configuration was changed. There was
no actual installer run, fresh-host discovery, live source collection, or visual
review in this correction. Viewer assets, schemas, and diagrams are unchanged.
Dev integration, main promotion, publication, and runtime acceptance remain
separate outcomes.
