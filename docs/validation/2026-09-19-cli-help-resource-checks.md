# CLI short help, version bundling, and resource coverage

Date: 2026-09-19

Scope: [issue #25](https://github.com/weirdry/stellar/issues/25), based on
`dev` at `db82ba087d91eedfc39dc731ddc8ca724b2fcc4c`. The candidate remains
`0.1.2-dev.0`. These additions follow the integrated
[CLI review corrections](2026-09-19-cli-review-corrections.md).

Boundary classification: unreleased — corrected in place. The help alias and
build checks extend the development candidate; published schemas and saved data
are unchanged.

## Changes and observed evidence

- **Short help:** global `-h` and every `COMMAND -h` match their `--help`
  counterparts in source and installed-copy tests. The isolated installed copy
  contains only the bundle, without schemas or viewer resources.
  Mixed help/workflow requests exit `2` without
  loading the workflow or changing the filesystem, with absent and pre-existing
  output names. Literal search text `-h` remains usable with pagination; explicit
  `./-h` still names an intentional output path.
- **Version bundling:** the root package import contributes only `version`.
  Disposable-copy tests edit the lint script, formatter version declaration,
  and description while keeping installed build/runtime dependencies unchanged.
  Checking succeeds without writes, and explicit generation leaves the bundle,
  manifest, and notices byte-identical. A product version change makes the
  artifacts stale; regeneration updates both source and installed version output
  and the manifest. Runtime source and viewer-byte changes still fail the gate.
- **Resource coverage:** disposable tests independently add an unlisted schema,
  locale, HTML, CSS, JavaScript, and SVG file under the current runtime directory
  conventions. Both comparison and generation fail with the omitted path and
  fixed-list location before touching generated artifacts. Removing a required
  schema also fails. Contributor Markdown, optional PNG, and brand SVG files
  outside the runtime patterns do not change the inventory. Doctor keeps its
  fixed allowlist; this adds no installed filesystem scanning or repair.
- **Installed continuity:** the existing isolated distribution replay passed
  with the bundle, manifest, schemas, viewer resources, and license files only.
  It exercises normalization and reading, first classification, user revision,
  refresh, agent overwrite refusal, rendering, and run verification. Its HTML
  matches the source renderer byte-for-byte. The replay now also checks `-h`.

[CLI tests](../../test/cli-diagnostics.test.js) and
[distribution tests](../../test/distribution.test.js) own these regressions.
[Distribution guidance](../development/distribution.md#runtime-files) defines
the current directory/extension patterns and the obligation to extend coverage
when runtime code begins reading a new resource type or directory.

## Artifact identity and checks

| Artifact                    | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `bin/stellar.mjs`           | `377817998e41fafd354cb0ae73a150287c518f2457c68835f5f785b6957659f3` |
| `bin/stellar.manifest.json` | `247f44cef3050265ef9c3a8db223050e49fe0075756808cced3641b8c4539bd2` |

The committed runner changes from **369,359 bytes** at the base to
**368,658 bytes**, a net reduction of **701 bytes** including the added help
support. This is an observation, not a size target or a performance benchmark.
Third-party notices are byte-identical to the base; dependencies and locks did
not change.

- `just init`: repository-pinned tools, frozen dependencies, and hooks prepared.
- `just format` and `just build-runner`: source formatted and committed artifacts
  regenerated explicitly.
- `just test`: **84/84 Node tests passed**, zero skips, including the isolated
  synthetic continuity replay and the new build/resource regressions.
- `just ci`: **84/84 Node tests passed**, zero skips; documentation, all eight
  diagram consistency sets, formatting/lint, repository checks, and generated
  bundle/manifest/notices currency passed.

## Evidence boundaries

Hosted CI results and the exact checked-out revision belong in the PR and issue.
Local tests do not establish independent review, dev integration, release,
installation, host discovery, or live source access.

`SKILL.md`, viewer resources, schemas, diagram artifacts, runtime dependencies,
and the product version are unchanged. No actual skills installer, fresh agent
host, user report, or live source was used. There was no local browser or visual
review in this change. Windows behavior, additional Node versions, and arbitrary
future runtime directories/extensions were not validated. All mutation and
corruption cases use disposable synthetic copies.
