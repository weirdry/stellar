# Run evidence and verification

Keep the selected input and final artifacts together so another host can inspect
the result without the producing session. All real captures, decisions, raw
responses and rendered derivatives remain private and outside public Git/CI.

## Choose the run location

Use the output directory specified for the current run first, then an output
location already established in the conversation. Without either, use
`~/Documents/Stellar/` in the execution user's home. The default is independent
of the task's working directory and the skill installation. A previous capture
or state supplied as input does not by itself select a new output location.

Resolve the selected directory to an absolute path before changing directories
to run the skill commands. Expand `~` against the execution user's home; resolve
relative user paths against the task's working directory. The agent selects and
passes the output path; the CLI still requires explicit output arguments.

Create a fresh `<run-name>/` under that directory for each generation or refresh,
creating missing parent directories as needed. Let continuity commands create
their own run directory as described below. If the selected location cannot be
used, report the failure and obtain another location rather than silently
switching to the checkout, task directory or temporary storage. Previous reports
and saved state remain in place; changing the default does not move or rewrite
them. Include the actual final path in the handoff.

## Prepare and retain evidence

For new collection or supplied native captures, read [collection retention](collection.md).
Remember/revise reuse the selected run's existing matching evidence; do not
load live-provider instructions or fabricate a new collection record.

## Retain the final folder

A useful final folder is:

```text
run-name/
  capture.json
  work-map.json
  stellar.html
  README.md
  verification.json
  state.json             # when preserving decisions for future runs
  changes.json           # emitted by continuity commands
  choices.json           # when choices were applied in this run
  evidence/              # for collection performed by this run
    collection.json
    raw/
```

These filenames are a convention, not an additional validator contract.
`state.json` is optional for a one-off report; include it when the user requested
preservation or continuation. Retain applied choices and relevant intermediate
runs when needed to trace a refresh. The final map records the agent's actual
classification; rerunning interpretation is not guaranteed to choose the same
taxonomy.

`classify-draft` and continuity commands must create their own fresh directory.
Collect and prepare inputs in a separate private staging directory, let
`classify-draft`, `remember`, `refresh`, `classify` or `revise` create the final
directory, then use `retain-response` for each selected capture, applied choices
or supporting evidence file copied into it. For example, when capture and choices
files are available, run these commands after the runner has created `$RUN`:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" retain-response "$STAGING/capture.json" "$RUN/capture.json"
node "$STELLAR_ROOT/bin/stellar.mjs" retain-response "$STAGING/choices.json" "$RUN/choices.json"
```

This preserves the input bytes and creates owner-only files (`0600`), refusing
existing destinations. Retain supporting evidence files the same way, keeping
their relative layout. Retaining authored inputs does not establish source-response
provenance. Keep previous reports and states. Do not pre-create the continuity
destination to store raw responses. New standalone runs can use a newly created
private directory.

The README identifies the selected capture, [renderer identity](#record-renderer-identity), output/state
paths, freshness and lookup limits, plus checks actually performed. If providing
a reconstruction script, include all its inputs and use paths relative to this
folder; verify it in a separate temporary output location. A script depending on
an external host transcript, spilled result or missing index is not a portable
reconstruction. If that evidence cannot be retained, state the limit; a usable
capture/report must not be described as independently reconstructed collection.

## Record renderer identity

For installed runs, record the Node and Stellar product versions, installer/source URL and requested ref when known,
and SHA-256 hashes of the installed `bin/stellar.mjs` and all viewer files,
including the locale catalogs. Do this when generating the report, before any
skill update. An installed copy has no Git metadata; do not infer a commit from
its directory name or claim that the current upstream head was installed.
If the source ref is unknown, say so. `--version` reports the product version,
including any development suffix; it does not prove a source commit or release.
See [CLI diagnostics](cli.md) for version and installation checks.
For development runs through `bin/stellar.ts` or Just, record the checkout
commit and any local source/resource changes instead; a bundle hash does not
identify a source runner that was used without rebuilding that bundle.

From the task directory, these read-only commands print the runtime version and
file hashes. Set `STELLAR_ROOT` to the absolute installed path, then retain the
output in the new run's README or a fresh evidence file:

```sh
node --version
node "$STELLAR_ROOT/bin/stellar.mjs" --version
node --input-type=module - "$STELLAR_ROOT" <<'NODE'
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2];
const files = ['bin/stellar.mjs', ...(await readdir(join(root, 'assets/viewer'),
  { recursive: true })).map(name => join('assets/viewer', name))].sort();
for (const file of files) {
  const path = join(root, file);
  if (!(await stat(path)).isFile()) continue;
  console.log(createHash('sha256').update(await readFile(path)).digest('hex') + '  ' + file);
}
NODE
```

Hashes identify files, not Git provenance. If verifying an older HTML report
fails or its renderer is unavailable, read
[renderer recovery](recovery.md#renderer-mismatch-or-missing-renderer-evidence).

## Check the final artifacts

Validate and render the selected final map from the operation route:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" validate "$RUN/work-map.json"
node "$STELLAR_ROOT/bin/stellar.mjs" render "$RUN/work-map.json" "$RUN/stellar.html"
```

If the matching capture or renderer evidence is missing, follow
[recovery](recovery.md) and disclose checks that cannot be performed. Do not
invent or replace evidence merely to run the following command.

From the task directory, select the matching native capture, map and HTML using
absolute paths, adding the actual state path when one exists:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" verify-run \
  /absolute/capture.json /absolute/map.json /absolute/report.html
node "$STELLAR_ROOT/bin/stellar.mjs" verify-run \
  /absolute/capture.json /absolute/map.json /absolute/report.html /absolute/state.json
```

Use one invocation, not both. This read-only command returns JSON on stdout;
retain it as `verification.json` in a fresh file if desired. Input/validation
errors return structured diagnostics on stderr. A mismatch exits with status 1;
bad command syntax exits with status 2. Do not redirect output over an input or
previous verification file. No browser or source calls occur.

The checks are:

- `captureFacts`: normalize the native capture again and compare owner, every
  source declaration, source issue fields and registered relationships. Source
  and issue array ordering is irrelevant; directed edges keep direction and
  related edges are undirected. Classification, targets and the runner's
  previous-observation notice are interpretation. Unqueried status labels are
  excluded UI placeholders. Labels on full-detail issues are compared verbatim,
  including the normalizer's English `Unknown` fallback for missing Linear
  status text, in either locale. Locale and view may originate in the capture
  but remain author-editable presentation choices after normalization. Taxonomy
  and optional document references are also outside this source-fact check.
- `embeddedMap`: exactly one bundled data slot parses to the final map.
- `bundledViewer`: the original HTML bytes match this installed runner's renderer output
  encoded as UTF-8 for that map. Decoding for JSON inspection is separate and
  cannot hide invalid UTF-8 bytes. A report from another renderer may fail this
  check; a mismatch alone does not distinguish an update from altered HTML.
  Follow [renderer recovery](recovery.md#renderer-mismatch-or-missing-renderer-evidence)
  when verifying an older report. Supplied HTML is never executed.
- `stateMap`: the optional state validates and its map equals the final map.
  Without a state it is `not-provided`, not a pass.

Differences identify the input role and JSON pointer without quoting issue text.
An unknown key in embedded HTML data is reported at its containing object or
array, without including that key in the diagnostic path.
Use the correct input pair or fix source facts against evidence, then regenerate
into a new output. Never patch HTML or saved state just to make a check pass.

Success proves consistency of the supplied artifacts, not live collection
completeness, semantic classification quality, historical preservation of prior
user choices, or browser/visual acceptance. The result lists these in
`notChecked`. Review source evidence, classification and any previous state
separately. Exercise interactions only with allowed browser tools; report an
unavailable visual check without bypassing host restrictions. Canonical maps
authored for providers without a native capture normalizer use `validate` and
`render` and disclose that this capture comparison was not performed.

## Deliver the result

With allowed browser tools, exercise the header, source identities, grouping tree,
issue neighbors, search and filters. Report generation, interaction checks and
visual inspection separately. If the host blocks that surface, disclose the
limit; do not bypass it or repeat the blocked navigation for each output.

Return clickable local HTML and saved-state paths, plus a concise account of
assigned/context counts, registered relations, purpose groups, freshness and
lookup limits. For continuation, identify the selected final stage and preserved
user choices, pending reviews and not-observed issues as applicable. HTML embeds
issue data. Do not upload reports, commit user data, alter source issues or claim
complete collection from a sample.
