# Read evidence progressively

Use this guide after normalization, before deciding classifications. The reader
accepts both drafts with pending classification and valid final maps. It reads
local files only and never edits source text, saved choices or the viewer.

## Evidence before relevance

The code may read a complete file without sending that file to the model.
Retain available descriptions intact; selective reading is a view over evidence,
not a shorter replacement capture. Follow [response retention](collection.md)
before collection. If a host already delivers full responses into model context,
asking the model to ignore most of them does not reduce that input. Stellar does
not intercept host tools or guarantee token/latency savings on every host.

Start from issue metadata. Use `read-body` to read short text directly without
an intermediate body index; use structural indexes when navigation helps with
longer text. Read enough source text to establish the outcome, deliverable and
explicit exclusions for an assignment.
These are questions, not required heading names. No organization, language,
provider or issue template supplies mandatory sections. For longer text, inspect
headings and previews, then request relevant blocks. All index pages remain
accessible; a preview or search miss is not proof that exclusions or
contradictory evidence are absent elsewhere.

Read more when the outcome is unclear, membership contradicts the group basis,
or a proposed claim needs another part of the text. A deployment/acceptance
claim, for example, may require later progress notes as well as an opening
description. Broaden to the whole body when necessary. If evidence is still
insufficient, follow the uncertainty rule in [classification](classification.md).
Do not treat a short excerpt as evidence that unseen text contains no limits.

For context, begin with available identity, title, status and explicit relations.
Retrieve/read more when needed to explain that context or classify it. Merely
belonging to a group is not a dependency. Unclassified context is allowed. A
user-supplied template can help navigation, but is not a default semantic filter.

## Commands

Set `STELLAR_ROOT` to the installed skill directory and pass an absolute draft/map
path from the task directory. `ISSUE` is the canonical
map id or an unambiguous display identifier; use the canonical id across sources
with colliding identifiers.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" inspect MAP.json
node "$STELLAR_ROOT/bin/stellar.mjs" inspect MAP.json "" 20
node "$STELLAR_ROOT/bin/stellar.mjs" read-body MAP.json ISSUE
node "$STELLAR_ROOT/bin/stellar.mjs" read-batch MAP.json REQUESTS.json
node "$STELLAR_ROOT/bin/stellar.mjs" read-body MAP.json ISSUE OFFSET
node "$STELLAR_ROOT/bin/stellar.mjs" inspect MAP.json ISSUE
node "$STELLAR_ROOT/bin/stellar.mjs" inspect MAP.json ISSUE 20
node "$STELLAR_ROOT/bin/stellar.mjs" read-issue MAP.json ISSUE BLOCK
node "$STELLAR_ROOT/bin/stellar.mjs" read-issue MAP.json ISSUE BLOCK OFFSET
node "$STELLAR_ROOT/bin/stellar.mjs" search-issue MAP.json ISSUE 'literal source text'
```

`read-body` returns up to 4,000 Unicode code points of the complete description,
with issue metadata and exact `text`, `start`, `end`, `offset`, and `nextOffset`.
Its `kind` is `body-text`. A short body fits in one call without a body index.
For longer bodies, follow `nextOffset` until null for a complete reading, or
switch to structural navigation when that better answers the current question.
Offsets are relative to the whole body, not a block. Empty, null and omitted
descriptions return empty text with null continuation; `descriptionPresent`
preserves the distinction described below. No text is summarized or rewritten.
The output bound reuses the block reader's chunk size; it is not a definition
of semantic relevance or a token budget.

`inspect` returns 20 entries per page, with `total` and `nextOffset`. Without an
issue it lists metadata with literal titles/statuses and without descriptions.
With an issue it indexes every body block in source order: headings, paragraphs,
lists, quotes and fenced code.
Structural detection is a navigation aid, not a complete Markdown parser or a
relevance classifier. No section is dropped or prioritized by its heading name.
Previews are at most 80 Unicode code points. Both body-index entries and search
matches include `previewTruncated`, true only when the preview omits more text.

Both `inspect` and `search-issue` put their results in **`items`**, not `entries`
or `matches`. An issue-index item's `id` is the canonical ID to use as `issueId`
in classification choices. A body-index item has `block`, `kind`, `start`, `end`
and preview fields; a search item has `block`, `offset`, `preview` and
`previewTruncated`. `read-issue` returns **`text`** rather than an items array,
with `start`/`end` locating that excerpt in the original description.

When filtering output in a shell with `jq`, inspect one successful result before
building a loop. In Bash or Zsh, enable pipeline failure propagation and stop
on errors so a successful `jq` cannot hide a failed reader command:

```bash
set -euo pipefail
node "$STELLAR_ROOT/bin/stellar.mjs" inspect "$MAP" | jq '.items[] | {id, identifier, scope}'
node "$STELLAR_ROOT/bin/stellar.mjs" search-issue "$MAP" "$ISSUE" "$QUERY" | jq '{total, nextOffset, items}'
```

Pass JSON directly through a pipe or file. For a shell variable, use
`printf '%s\n' "$result"`, not `echo`, which can interpret source backslashes.
Check command failures before interpreting output as evidence; fix a failed
single call before repeating it across issues. Follow returned `nextOffset`
values rather than assuming a fixed number of pages.

`read-issue` returns up to 4,000 code points of the chosen block, without
rewriting text or line endings. Follow `nextOffset` for the next chunk and the
body index for other blocks. `start`/`end` locate the exact excerpt within the
original description; offsets are zero-based Unicode code points, end exclusive.
Concatenating every block's chunks reproduces the original string, including
whitespace and code. A large unheaded paragraph is still fully accessible.

`search-issue` is case-sensitive literal search, not regex or semantic search.
It searches the complete original body, including text across heading and
paragraph boundaries, and returns 20 non-overlapping matches per page; pass a
final offset to continue. Each match has a block and an offset locating its
start, usable by `read-issue`. For a match spanning blocks, read the following
blocks to obtain the remainder and surrounding context. A query reflects the
agent's current hypothesis, not a complete filter for purpose or exclusions in
other wording.

These are bounded output pages, not token guarantees or limits on the evidence
that may be read. Relevance and stopping remain agent judgments. In metadata,
`descriptionPresent` is true for an observed string or null, and false for an
omitted description. An empty string and an observed null both represent empty
text; neither implies an inferred purpose.

Length and `descriptionHash` describe the readable text: `description ?? ''`,
with SHA-256 over its JSON-encoded string. Missing, null and empty descriptions
therefore share the empty-text hash; compare presence separately to distinguish
an observation from an omitted field. The hash is not an observation fingerprint.
If text changes, rebuild the index before reusing block numbers/offsets. Source
detail/coverage does not change as a result of choosing an excerpt.

## Batch selected evidence

When several body or block chunks are needed, `read-batch` shares issue metadata
and local preparation within one invocation. Keep `read-body` for a single short
body; batching does not guarantee a smaller response when every issue occurs only
once. Choose evidence for the same purpose/exclusion questions as individual reads.

Create a JSON request array, using canonical IDs from `inspect` where identifiers
collide. Omit `block` for whole-body reading; include it for structural block reading:

```json
[
  { "issue": "ISSUE_ID" },
  { "issue": "ISSUE_ID", "block": 2 },
  { "issue": "ISSUE_ID", "block": 2, "offset": 4000 }
]
```

Only `issue`, `block` and `offset` are accepted. `issue` is a canonical ID or
unambiguous display identifier. Optional `block` and `offset` must be non-negative
JSON integer numbers, not strings; the text offset defaults to 0. These are
explicit selections, not instructions to fetch every remaining chunk automatically.

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" read-batch MAP.json REQUESTS.json
node "$STELLAR_ROOT/bin/stellar.mjs" read-batch MAP.json REQUESTS.json 20
```

The response has `kind: "batch-excerpts"`, `total`, `offset`, `nextOffset`,
`issues` and `items`. Up to 20 requests are returned per page, each with at most
4,000 Unicode code points, reusing existing reader bounds. Empty plans and an
end-of-list offset return empty arrays with null continuation.

- `items[].request` is the zero-based index in the original request array. Order
  and duplicate requests are preserved.
- `items[].issueIndex` indexes this response's `issues` array. Each selected issue
  appears there once, with its canonical identity, status, presence, body length
  and description hash. This index is local to the page, not a persistent ID.
- Other item fields match the individual reader: `kind`, optional `block`, exact
  `text`, body-relative `start`/`end`, selection-relative `offset` and `nextOffset`.
  Joining the referenced metadata back as `issue` reproduces the individual result.
- Top-level `nextOffset` pages the **request list**. An item's `nextOffset` continues
  its **body or block**. Null at the top level does not mean all bodies were read.
  To expand, create the next request with that item's text offset or use the
  existing individual reader, retaining its issue and optional block.

The map is read, parsed and validated once per invocation. Selection lookup and
preparation are shared by canonical issue ID. Validating the whole plan retains
only each selected issue's code-point length and, for block requests, block
boundaries; code-point text is prepared only for issues on the returned page,
once per issue. Returned metadata and its hash are computed once per issue on
that page. Memory still grows with the map and plan size. The complete request plan
is validated before output, including selections on later pages. Validation stops
at the first invalid request and fails the invocation without partial stdout,
with one diagnostic indexed under `/requests/N`. Fixing it may expose another
invalid request on the next attempt; errors are not aggregated. Unreadable or
malformed request files use `/requests`. Neither input file is modified. This is
not partial-success processing.

Keep the map and request file unchanged while paging. Metadata is self-contained
on each page; compare description hashes/presence across reads and restart after
source changes before reusing blocks/offsets. There is no persistent reader cache
or snapshot lock. Missing/null/empty text retains the individual reader semantics.
Output bounds are not token guarantees; all retained evidence remains available.
