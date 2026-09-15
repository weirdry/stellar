# Source retention and progressive reading

Date: 2026-09-16

State: **As-built**

## Scope

The host retains obtained source responses mechanically. The new
`retain-response` command copies a host-provided file to a fresh private file,
returning its size and digest without echoing the payload. It does not certify
the input's provenance or obtain a tool response on the host's behalf.

After normalization, `inspect`, `read-issue` and `search-issue` provide structural
indexes, exact excerpts and literal search. They accept draft and final maps;
they neither classify nor edit them. Navigation is independent of provider,
language and heading vocabulary. The agent decides when more evidence or a
complete reading is needed. Obtained descriptions remain intact.

The skill also clarifies sample/context scope, original response versus authored
transcription, stage-specific review counts, the meaning of `notObserved`, and
reporting an already-known browser restriction without repeating blocked calls.

Boundary classification: unreleased — corrected in place. Capture, map, state
and viewer contracts are unchanged. No prior user artifacts were rewritten.

## Local executable evidence

- `just init` succeeded with existing pinned tools and frozen dependencies;
  dependency and tool locks did not change.
- `just ci` passed documentation, formatting, lint and repository checks plus
  all 57 Node tests. Six new tests cover draft/CLI access, ambiguous identifiers,
  exact reconstruction, pagination, late evidence, literal search, private
  diagnostics, missing text, and response-file preservation.
- The skill-creator quick validator accepted the skill entry. Its Python YAML
  dependency was installed in a temporary validation environment, not added to
  the repository's runtime dependencies.

## Independent synthetic invocation

A separate agent received the current skill and an invented English capture,
with a request for a map and refresh state in a fresh private directory. It was
not given an expected taxonomy or a list of traps. The capture used varied prose
and French headings; a long description placed its current decision after many
paragraphs of superseded design notes. It contained no private pilot data.

The agent used root Just commands to retain the input, normalize, inspect issue
and body indexes, read selected blocks, validate, remember, render and verify.
It followed the long body's second index page and read its later decision,
distinguishing the current purpose from historical notes. Its three categories
separated public communication, calibration tooling and aggregate production.
This is one observed semantic exercise, not a guarantee of classification quality
or a requirement that future runs produce the same taxonomy.

The source copy remained byte-identical. `verify-run` passed `captureFacts`,
`embeddedMap`, `bundledViewer` and `stateMap`, with no diagnostics or pending
classifications. The report, state, verification result and invocation artifacts
remain local. This was an explicit isolated skill invocation, not automatic
discovery, installation or cross-host validation.

## Limits

The host browser refused local-file navigation; visual and interactive review
were not performed and the restriction was not bypassed. Viewer code, rendering
and their input contract are unchanged, so no additional local browser regression
run was required. Hosted CI results belong to the exact PR head and are reported
separately.

No live source was collected. A supplied synthetic response file exercises the
copy path, not authenticated source provenance or a host connector's export
capabilities. There is no token/latency benchmark: content already delivered into
model context cannot be retroactively reduced. Bounded views can still miss
relevant evidence if the agent stops too early; complete text remains accessible.
