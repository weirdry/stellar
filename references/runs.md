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

Before live collection, establish a mechanical route from the host's actual
returned object/text or response file to private storage. A host-provided file
can be retained without printing its content:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" retain-response HOST_RESPONSE_FILE NEW_STAGING/evidence/raw/response.json
```

This copies bytes to a fresh owner-only file and returns a byte count/hash, not
the payload. It cannot establish how its input was obtained. With an accessible
return value, host-side code can serialize it directly to a file instead. Parse
MCP wrappers mechanically, retaining the original response alongside extracted
issue data. Network-layer byte capture is not required. Do not put credentials
or unrelated transcript material in evidence.

Output failures distinguish an occupied destination (`response-exists`), a
non-directory parent (`response-parent`), and denied permissions
(`response-permission`); other failures use `response-output`. Each includes
repair guidance without echoing the raw filesystem path. Keep existing files
when correcting the destination.

Do not ask the model to re-emit full responses into shell heredocs or authored
JSON as a substitute for this transfer. Comparison with a capture assembled
from the same transcription only proves downstream consistency, not fidelity
to the tool's original response. If the host exposes only model-visible text
and no supported file/object export, disclose that boundary. Use another
already-authorized export or supplied capture when available; otherwise report
the missing capability. Do not repeatedly recollect or reconstruct historical
responses from memory to satisfy an evidence claim. Already saved artifacts
remain useful with their actual provenance stated.

For live collection, retain the relevant native tool responses as they arrive,
including exhausted pages, separately queried relationships and failed lookups.
Keep authentication headers, tokens and unrelated session content out of this
record. Parse wrappers mechanically; preserve descriptions and source fields.
Record the actual query scope, observation start/end, pagination completion,
lookup outcomes and relative response locations in `evidence/collection.json`.
This is a local collection account, not a new capture schema or a source-access
proof produced by the runner. Unknown coverage remains unknown or partial.
Index failed attempts as well as successful retries when their responses are
available; label a narrative failure account as such. Distinguish observed
metadata, obtained descriptions, and never-queried detail. Selective model
reading never authorizes discarding obtained context bodies from the capture.

A requested sample bounds the assigned set, not the size of its context or
descriptions. Keep direct context retrieval purposeful; do not recursively
expand it by default. Record actual scope and retrieval limits. If reporting
workload, separate assigned/context queries, response size, and retries when
known. Observation windows are not provider latency measurements or proof of
model/token efficiency; savings require an appropriately comparable measurement.

For a supplied capture, retain an unchanged input copy and explain that no new
collection occurred. Original raw responses may be unavailable; disclose that
limit rather than fabricating a collection record. Translate author-owned locale
or scope/notes only when requested, retaining the original input separately and
recording those changes. Do not change observed facts or freshness.

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

For installed runs, record the Node version, installer/source URL and requested ref when known,
and SHA-256 hashes of the installed `bin/stellar.mjs` and all viewer files,
including the locale catalogs. Do this when generating the report, before any
skill update. An installed copy has no Git metadata; do not infer a commit from
its directory name or claim that the current upstream head was installed.
If the source ref is unknown, say so. There is no runner `--version` command.
For development runs through `bin/stellar.js` or Just, record the checkout
commit and any local source/resource changes instead; a bundle hash does not
identify a source runner that was used without rebuilding that bundle.

From the task directory, these read-only commands print the runtime version and
file hashes. Set `STELLAR_ROOT` to the absolute installed path, then retain the
output in the new run's README or a fresh evidence file:

```sh
node --version
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

Hashes identify the files, not their Git provenance, and cannot restore a past
installation. This record is not a new work-map/state field or a verifier input.
For a known ref, an isolated installation of that ref can recover the original
runner and resources; compare recorded hashes before using it for verification.
Use a fresh temporary directory and a project-local install **without `-g`**;
do not replace the current global skill to recover an older runner. Replace `REF`
below with the recorded tag or full commit SHA. This keeps the task directory
unchanged and selects the recovered runner only if installation succeeds:

```sh
STELLAR_RECOVERY="$(mktemp -d)" &&
  (cd "$STELLAR_RECOVERY" &&
    npx --yes skills@1.7.0 add \
      https://github.com/weirdry/stellar/tree/REF \
      --skill stellar --agent codex -y) &&
  STELLAR_ROOT="$STELLAR_RECOVERY/.agents/skills/stellar" &&
  printf '%s\n' "$STELLAR_ROOT"
```

After success, record the final printed absolute path and use it explicitly in
later shell calls; do not assume these variables survive between tool calls.
The recovered copy is under `$STELLAR_RECOVERY/.agents/skills/stellar`, with its
project lock at `$STELLAR_RECOVERY/skills-lock.json`; the current global install
and its lock are retained. Use absolute report paths with the recovered runner
after comparing its files to the recorded hashes.
If the original files cannot be recovered, disclose that original-renderer
verification is unavailable. Generate and verify a separate new report with the
current runner if needed; keep the original HTML and its verification history.

## Check the final artifacts

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
  Use the [recorded renderer identity](#record-renderer-identity) to recover and
  verify with the original files when available. Otherwise generate a separate
  new report, preserving the old one; verifying the new report does not verify
  the original HTML. Supplied HTML is never executed.
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
