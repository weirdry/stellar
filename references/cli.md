# CLI diagnostics and help

Resolve `STELLAR_ROOT` to the absolute installed skill directory. The installed
runner uses Node.js 24.x and works from the task directory without Git, npm
dependencies, contributor tools, or network access. Examples use the same runner
that the skill invokes; installation does not register a `stellar` PATH command.

## Identify the installed product

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" --version
node "$STELLAR_ROOT/bin/stellar.mjs" -V
```

Both print `stellar VERSION`. The authoritative value is
[`package.json`](../package.json); the build embeds it in the runner, so an
installed version query needs no package manifest or installer lockfile.
A suffix such as `-dev.0` identifies an unreleased development build. Do not
describe it as a published release or remove the suffix in a handoff.

Version labels do not establish an exact source commit, local modifications, or
publication. Retain the source ref when known and the actual file hashes using
[renderer identity](runs.md#record-renderer-identity). Schemas and viewer resources
are not loaded for version or help requests, allowing both to work when those
files are missing or damaged.

## Diagnose an installation

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" doctor
node "$STELLAR_ROOT/bin/stellar.mjs" doctor --json
```

Use this after installation/update or when investigating execution failures.
It is not a prerequisite before each ordinary report. The default output is a
readable summary. JSON contains `version`, the resolved installation `root`,
`ok`, per-file/runtime `checks`, and a statement of `scope`. Each check has an
`id`, `status` (`pass`, `fail`, or `skip`), `message`, and a `fix` remedy when relevant.

Doctor checks the running Node major version and compares the bundled runner,
four input schemas, and required viewer resources with the generated
[`bin/stellar.manifest.json`](../bin/stellar.manifest.json). The
[build script](../scripts/build-runner.js) generates this manifest from the same
bundle and resource bytes; [installation.js](../lib/installation.js) owns the
fixed checked-file inventory. Missing files, unreadable/non-file paths, and byte
mismatches fail. An absent, malformed, or version-mismatched manifest fails;
readable files whose hashes cannot be checked are marked `skip`, never passed.
File reads are limited to the fixed inventory, not paths supplied by the manifest.

The command reads only and does not execute viewer code, repair permissions,
replace files, collect data, or contact a source system. Reinstall the intended
GitHub ref through the skills installer when an installed copy is incomplete.
For deliberate source/resource changes in a checkout, use `just build-runner`
and the repository gate. Keep reports and saved state outside the installation.

A passing doctor result establishes consistency with its local build manifest,
not authenticity of a release or semantic correctness of the build. It does not
verify host skill discovery, credentials, source access, report consistency, or
browser behavior. Use `verify-run` for a selected report's artifact comparisons.
The runner must itself be executable: missing Node or an unparseable/missing
runner requires checking prerequisites/reinstalling before doctor can run.
Some unsupported Node versions may fail to load the runner before diagnostics;
Node 24.x remains the supported prerequisite.

## Discover command usage

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" --help
node "$STELLAR_ROOT/bin/stellar.mjs" help render
node "$STELLAR_ROOT/bin/stellar.mjs" render --help
```

`help COMMAND` and `COMMAND --help` produce identical descriptions, arguments,
output behavior, examples, and exit-code guidance. They need no normal input
files and do not execute the requested workflow. Help and error pointers print
the running Node executable and entry-file paths, quoted for a POSIX shell;
they work without a `stellar` PATH launcher, including paths with spaces or
single quotes. The
[command catalog](../lib/cli-help.js) owns help text and argument counts.
Use exact help forms without additional positional arguments. A bare `--help`
mixed with other arguments is rejected before loading the workflow or writing
files (exit `2`). The exception is `search-issue`'s `TEXT` argument: it remains
literal text, so `search-issue MAP.json ISSUE "--help"` searches for that string.
Use `./--help` when intentionally naming a file or directory `--help`.

| Exit code | Meaning                                                                   |
| --------- | ------------------------------------------------------------------------- |
| `0`       | Successful execution, help/version output, or all required checks passed. |
| `1`       | Failed check, invalid input data, or execution/runtime loading failure.   |
| `2`       | Unknown command/help topic, unsupported option, or wrong argument count.  |

Machine-readable results go to stdout; execution/usage diagnostics go to stderr.
Doctor emits its requested result format even when checks fail (exit `1`).
Runtime import failures report an error category, selected filesystem/module
error codes, and a repository-relative code location when available. Original
exception messages and resource excerpts are omitted because schema parsing or
compilation errors can contain file contents. The
[diagnostic helper](../lib/cli-diagnostics.js) owns this formatting.
Follow the executable doctor pointer to check installed files. If doctor passes,
investigate the reported runtime code/dependency failure; a healthy manifest
does not establish executable correctness or validate current checkout source.
Contributors can use `just ci` to investigate source/build failures. Installed
users should report the version and safe diagnostic to the maintainer.
Existing workflow-specific JSON diagnostics retain their input paths and repair
guidance. Commands never need an interactive prompt.

## Contributor equivalents

From a prepared checkout, use `just version`, `just doctor`,
`just doctor --json`, and `just help COMMAND`. These execute canonical source;
the doctor inventory still checks the committed installed bundle and resources.
Only `just bundle-check` establishes that the bundle matches the current source.
`just init` prepares contributors and is not an installed product command.
