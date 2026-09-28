# Recover only the affected boundary

Read the matching section when its condition occurs. Preserve original inputs
and earlier successful runs. Diagnostics do not authorize inventing source facts,
removing relationships, relabeling unknown status, pruning state, or source writeback.

## Failed or incomplete runs

JSON/continuity diagnostics identify the input role and document-relative JSON
pointer. Choices need a nonempty update; a missing draft classification points
to the draft issue, not a choices-array index. Repair against the owning capture,
[state/choices rules](continuity.md), or [work-map contract](../schemas/README.md).
A read failure needs path/read-access repair, not JSON edits. If the same failure
repeats, inspect that contract instead of retrying unchanged.

Output failures identify `/run`; select a fresh writable path. Existing paths
are refused. If cleanup reports leftovers, inspect that failed directory and
never continue from it as saved state. Keep earlier successful artifacts.
Retention failures distinguish occupied destinations, non-directory parents and
permissions; correct the destination without replacing existing files.
Unresolved source access can be partial coverage; invalid structure must be
fixed before delivery. For an unusable output location, obtain another location
instead of silently selecting temporary storage or the checkout.

## Missing capture or collection evidence

Retain available originals and disclose what is missing. Do not retype tool
responses, reconstruct them from memory, invent observation times or call new
collection a reconstruction of an old run. See [collection retention](collection.md)
only if obtaining new evidence is needed and authorized.
Without a matching supported capture, validate/render the map and check its
selected state and requested changes separately. State that `captureFacts` and
full `verify-run` were not performed; a new report does not prove prior collection.
Do not alter source facts to make mismatched capture/map inputs pass verification.

## Local document references

Continuity cannot bundle report-relative files. Keep the original map/state and
reference files intact. Use the standalone renderer beside those files when local
references are required, or verified HTTP(S) references when available. Do not
drop references or upload private documents to pass validation. Disclose that
saved continuation is unavailable for these local references.

## Renderer mismatch or missing renderer evidence

A `bundledViewer` mismatch alone cannot distinguish altered HTML from a different
renderer. Use the recorded [renderer identity](runs.md#record-renderer-identity).
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
