# Installation and release

## Installed skill

Stellar is MIT licensed and distributed as a GitHub-hosted skill. The public
`skills` installer is fetched by npx; Stellar itself is not published to npm.
Node.js 24.x is the runtime prerequisite. Installation and updates through the
documented npx commands also require npm/npx and Git to retrieve this repository.
Installed report generation requires neither Git
nor a development checkout, mise, Just, pnpm, or installed npm dependencies.

The normal entry point installs validated default-branch `main`:

```sh
npx skills add weirdry/stellar --skill stellar -g
```

The installer discovers the root `SKILL.md` and copies that directory from the
selected Git revision. Its canonical copy and agent registration locations are
owned by the installer. Select the desired agents interactively, or use
`--agent codex claude-code`. Hosts may require a fresh session to discover it.
Installation does not configure source credentials or prove automatic discovery.
With the verified `skills@1.7.0` global Codex/Claude Code installation, the
canonical directory is `~/.agents/skills/stellar`; Claude Code registers a
symlink at `~/.claude/skills/stellar`. Use `npx skills list -g` to confirm the
actual path for your installation, and set `STELLAR_ROOT` to that directory
when following manual runner examples.

For an exact release or review revision, replace `REF` with a real tag or full
commit SHA that is available on GitHub:

```sh
npx skills add https://github.com/weirdry/stellar/tree/REF --skill stellar -g
```

The short command follows the repository's default branch, `main`. Installing a
review branch is an explicit development preview, not a release. Published tags
are listed in [GitHub Releases](https://github.com/weirdry/stellar/releases).
The first release identity is `v0.1.0`; verify its publication before using the
version-pinned command:

```sh
npx skills add https://github.com/weirdry/stellar/tree/v0.1.0 --skill stellar -g
```

Updates and interactive removal belong to the same installer:

```sh
npx skills update stellar -g
npx skills remove stellar -g
```

An exact-SHA or immutable-tag installation stays on that ref: `skills update`
does not advance it to a newer release. To move it, run `skills add` again with
the desired new tag or SHA using the exact-ref command above. A default-branch
installation follows updates on that branch.

Removal asks for confirmation. In a non-interactive agent or script, use
`npx --yes skills remove stellar -g -y` to confirm both npx execution and removal.
Without `-y`, removal can exit zero while leaving the skill installed. Confirm
the result with `npx skills list -g`.

Update or reinstall replaces the installed directory, including any locally
added files. Reports and saved state outside that directory are retained.
Keep reports outside the installation, normally under
`~/Documents/Stellar/`. Do not store user captures in an installed skill directory.
Record the [renderer identity](../../references/runs.md#record-renderer-identity)
with each report before updating; hashes identify files but cannot restore them.
Before replacing a developer symlink, inspect it and choose deliberately between
the installed copy and checkout; Stellar's `just skill-link` refuses to replace
another installation. A local-path `skills add` copies the local source directory;
do not feed it a working checkout containing private ignored files or dependencies.
Use a clean export or a GitHub ref for installation tests.

## Runtime artifact and source ownership

### Product identity and local diagnosis

[`package.json`](../../package.json) owns the product version. The build embeds
it in the runner; `--version` and `-V` work without Git, installer metadata,
schemas, or viewer resources. Development revisions use a prerelease suffix
such as `-dev.0` until a release is deliberately prepared. A version label does
not prove a Git commit or publication.

`doctor` / `doctor --json` check Node and installed build consistency using a
generated integrity manifest. `help COMMAND`, `COMMAND --help`, and `COMMAND -h` describe
individual commands without loading their data-processing runtime.
[CLI diagnostics and help](../../references/cli.md) owns the commands, outputs,
exit codes, remedies, and limits; [run identity](../../references/runs.md#record-renderer-identity)
still records actual renderer hashes. Keep diagnostics separate from host
discovery, credentials, source collection, and report/browser validation.

### Installation footprint

The root skill distribution includes public contributor documentation and brand
assets as well as runtime files. Retaining the diagram sources and readable
HTML/SVG views in that installation is an accepted tradeoff for this release
candidate: users can inspect the system locally, while maintainers keep one
authoritative tree. Those files are not loaded during report generation.

At branding revision `09af447`, the 160 tracked files total **10,186,956 bytes**,
versus **1,213,888 bytes** across 122 files at its base `204f8b7`. Diagram HTML/SVG
accounts for **7,226,932 bytes**, and the approved banner for **1,597,084 bytes**.
These are uncompressed Git file contents, not measured download traffic, Git
object storage or a new installed-footprint measurement. Later diagram edits
change the exact total; the tree at the selected ref owns that inventory.

Keep the approved banner pixels and current distribution structure. Reconsider
packaging only when measured installation/update cost or sustained asset growth
justifies a separate distribution layout. Release installation checks must
record the actual installed footprint rather than treating these source totals
as an installer guarantee.

### Runtime files

`bin/stellar.js`, `lib/`, and the product version in `package.json` remain the canonical runner source. Root Just product
commands execute that source with locked dependencies. `just build-runner`
explicitly generates committed `bin/stellar.mjs` with esbuild and
`THIRD_PARTY_NOTICES.txt` from the included packages' full license texts. The
bundle is readable JavaScript, not a platform binary. It contains Ajv and other
runtime JavaScript dependencies, with Node built-ins remaining external.
The pinned platform-specific esbuild executable is a development dependency;
its postinstall script is disabled and it is not needed by installed users.

The build narrows only the root `package.json` import to its `version` field.
Source commands still read the authoritative package version directly; installed
commands need no package manifest. Scripts, descriptions, and development
dependency declarations do not enter the bundle. With installed dependencies,
runtime inputs, and build tools unchanged, metadata-only edits leave the bundle,
manifest, and notices byte-identical. Changing the product version or actual
runtime/build inputs still requires regeneration; this does not exempt dependency
upgrades from their usual locked install and validation.

The same build generates `bin/stellar.manifest.json`, containing the product
version and SHA-256 hashes of the runner and fixed runtime resource inventory.
Doctor detects missing or altered installed files against this local manifest;
it does not authenticate that manifest or establish source/build correctness.

Before generating or comparing artifacts, the build independently enumerates
`schemas/*.schema.json`, `assets/viewer/*.{html,css,js,svg}`, and
`assets/viewer/locales/*.json`, plus the generated runner. It compares that set
with the fixed `runtimeFiles` list in [installation.js](../../lib/installation.js).
An unlisted resource, absent listed resource, or duplicate entry fails before
artifact writes and identifies the inventory to correct. Restore missing files
or deliberately update the list before regenerating; the check never adds entries
or repairs artifacts. Installed doctor continues to read only the fixed list.

These are the current runtime directory and extension conventions, not a scan
of arbitrary future resource reads. Documentation, optional images, and brand
assets outside these patterns are excluded. If runtime code starts consuming a
new directory or file type, update discovery and the fixed list together, with
coverage tests. Merely adding an optional asset does not make it a runtime input.

The bundle remains in `bin/`, preserving the source modules' paths to authoritative
`schemas/` and `assets/viewer/`. These resources are installed alongside it, not
duplicated into a second hand-maintained distribution tree. The root skill and
its focused references call `node "$STELLAR_ROOT/bin/stellar.mjs"` from any task
directory. Installed users do not run contributor setup. All output arguments
remain explicit, and continuity still refuses occupied run paths.

`just bundle-check`, included in `just ci`, builds in memory and compares all three
generated files byte-for-byte. It fails on missing/stale files without repairing
them. Regenerate deliberately after changing runner source or dependencies, then
commit the generated files with their owners. Schema and viewer files remain
runtime inputs and require their normal tests; the bundle check alone does not
validate their behavior. Re-run `just build-runner` after formatting source.

## Verification

- `just init` and `just ci`: frozen development install, bundle currency, source
  tests, and an isolated runtime test with only the bundle, schemas, viewer, and
  license files. The test exercises first classification, user revision, refresh,
  agent authority refusal, rendering and consistency, with an unrelated working
  directory and no dependency/tool lookup environment. It also compares the
  installed runner's report byte-for-byte to the source renderer.
- `just browser-check`: the pinned Chromium suite on synthetic data.
- Explicit installation: run a pinned official skills CLI in an isolated home
  (for example, a disposable container), selecting Codex and Claude Code. Exercise
  the installed skill instructions using only invented captures. Do not replace
  a maintainer's existing skill or read their reports to perform this check.
  Record the installer version, source ref, runtime, commands, and limits.

Command replay, explicit agent invocation, automatic discovery, live source
collection, and publication are separate evidence. See the
[installation validation record](../validation/2026-09-18-skill-installation.md).

## Release procedure

For a release containing product version reporting, set the intended release
version in `package.json`, remove its development suffix, and run
`just build-runner` and `just ci` before promotion. On the validated release
commit, verify that the intended immutable tag is exactly `v` followed by
`node bin/stellar.mjs --version`'s version value. Publish that same commit; do
not change the version or rebuild between validation and tagging. Record the
tag, commit, product version, and installation evidence in the release notes.
The label alone is not a publication check. Start later development with an
appropriate prerelease value and regenerate the bundle and manifest; never
modify already published tags. This adds version alignment to the existing
manual release procedure, not an automatic publisher.

After review and integration, validate the intended `dev` head with local and hosted CI and
the isolated installation workflow. Follow
[CONTRIBUTING](../../CONTRIBUTING.md#promoting-dev-to-main) to fast-forward `main`
only on maintainer direction. Use an immutable `v0.1.0` tag on the validated
`main` commit for the first release, with a GitHub Release identifying that commit,
installation command, Node prerequisite, supported hosts tested, and known limits.
No Stellar npm publication or separate upload bundle is required: the Git revision
contains the skill, runtime and notices.

Verify installation from the published tag before reporting release completion.
Later corrections use a new tag; never move an existing release tag. A broken
installation can be replaced with a known-good tagged copy while preserving user
reports and state. No automatic state migration, rollback script, or publication
workflow is introduced for this first manual release path.
