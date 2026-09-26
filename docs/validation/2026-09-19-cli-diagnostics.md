# CLI identity, diagnostics, and help validation

Date: 2026-09-19

Scope: [issue #23](https://github.com/weirdry/stellar/issues/23), implemented on
`feature/cli-diagnostics` from `7a75c3853e95843cefc9656ae1ce9d19106379e5`.
The product identifies this unreleased candidate as `0.1.2-dev.0`. This record
covers local author checks; hosted results and integration are tracked by the PR
and issue separately.

## Artifact identity

| Artifact          | SHA-256                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `bin/stellar.mjs` | `5c06859c3ecbf03abf015df3cfe03b8bdac69e97762e511803d5056fb3a17c11` |
| `SKILL.md`        | `dc40918328dcce05584739be586ec7af50ed24219bcc65f12cd83e1fa6f6b33b` |

The generated [build manifest](../../bin/stellar.manifest.json) records the
runner and fixed runtime resources. The version comes from
[package.json](../../package.json) and is embedded in the bundle. A manifest
comparison establishes local byte consistency, not release authenticity.

## Repository checks

- `just init`: the pinned tools and frozen dependencies were already available;
  repository hooks were enabled. No selector or dependency lock was changed.
- `just ci`: **77/77 Node tests passed**, including seven new diagnostic/help
  tests. Documentation structure, all eight diagram sets, formatting, lint,
  shell/workflow checks, Git whitespace, and bundle/manifest/notices currency
  passed.
- `just version`, `just doctor --json`, and `just help render`: source wrappers
  returned the expected version, **13 passing local checks**, and command help.

The first test pass found an accidental change to the empty-search error's exit
code. Argument handling was corrected to preserve the existing structured data
diagnostic; the existing reading regression and all other tests then passed.

The [CLI tests](https://github.com/weirdry/stellar/blob/b5c9346d0b65653f8f2706357c55e06fae63bb40/test/cli-diagnostics.test.js) exercised:

- Version aliases and both help forms for every command, including an isolated
  bundle without schemas, viewer resources, package.json, or installer metadata.
- Healthy installation, unrelated working directory, paths containing spaces,
  and symlink resolution.
- Missing, changed, and non-file resources; malformed or absent manifests;
  version mismatch; and rejection of manifest-provided paths outside the fixed
  product inventory. Damaged JavaScript was hashed without execution.
- POSIX read denial, with permissions unchanged by doctor. This test ran on the
  author's non-root macOS account; the test explicitly skips Windows and root.
- Unsupported Node reporting by overriding the version property in a child
  process. This checks the diagnostic branch, not compatibility with an actual
  older Node runtime.
- Invalid arity/options and unknown help topics failing before runtime loading
  or file mutation. Synthetic private markers did not enter diagnostics.

The [distribution tests](https://github.com/weirdry/stellar/blob/b5c9346d0b65653f8f2706357c55e06fae63bb40/test/distribution.test.js) replayed generation,
user revisions, refresh, protected user choices, rendering, and verification
through a copied installed bundle with an empty lookup environment. The build
gate rejected bundle, manifest, and product-version drift without repairing it.

## Explicit candidate-skill workflow replay

The author read the updated skill entry and its linked input/classification
guidance, then followed those instructions against a separate copied candidate
skill and unrelated task directory. The copy contained the bundled runner,
manifest, schemas, viewer, instructions, references, and license notices; it
had no development source, package manifest, dependencies, or Git metadata.
Direct execution used the absolute Node.js **24.19.0** binary and an empty
environment. No global skill was replaced.

The supplied input was the repository's entirely invented observatory capture
and choices. Its five issues (four assigned and one context) and three source
relations were retained. The author read the indexed source bodies and checked
the supplied category rationales before applying them: two transit research
issues share an outcome, while control retries and shared delivery infrastructure
have distinct operational purposes. This was not new live collection.

**23 successful runner invocations** covered version aliases, doctor JSON,
equivalent normalize help, normalization, issue/body inspection and reading,
first classification, retention of the supplied capture/choices, validation,
rendering, and saved-state verification. All four `verify-run` comparisons
(`captureFacts`, `embeddedMap`, `bundledViewer`, `stateMap`) passed. The capture
and every copied installation file retained their original bytes.

Detailed command receipts and the synthetic report remain in ignored
`outputs/cli-diagnostics/`. This is an explicit author-guided replay of the
candidate skill instructions, not proof of automatic skill discovery or a fresh
host session. The automated distribution test separately covers continuity.

## Limits

- No source schema, viewer asset, diagram, or rendering algorithm changed.
  Diagram consistency was checked; no diagram regeneration was required.
- Local Chromium/visual review was not repeated for this CLI-only change.
  Artifact comparisons do not establish visual interaction acceptance.
- No actual skills-installer installation, fresh-host invocation, live source
  access, or real user report/state operation was performed in this task.
- No release, main promotion, published tag change, or maintainer skill update
  is established by these checks. Development integration remains a separate
  issue-completion condition.
