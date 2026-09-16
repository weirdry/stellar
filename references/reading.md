# Read evidence progressively

Use this guide after normalization, before deciding classifications. The reader
accepts both drafts with pending classification and valid final maps. It reads
local files only and never edits source text, saved choices or the viewer.

## Evidence before relevance

The code may read a complete file without sending that file to the model.
Retain available descriptions intact; selective reading is a view over evidence,
not a shorter replacement capture. Follow [response retention](runs.md#prepare-and-retain-evidence)
before collection. If a host already delivers full responses into model context,
asking the model to ignore most of them does not reduce that input. Stellar does
not intercept host tools or guarantee token/latency savings on every host.

Start from issue metadata and a structural body index. Read enough source text
to establish the outcome, deliverable and explicit exclusions for an assignment.
These are questions, not required heading names. No organization, language,
provider or issue template supplies mandatory sections. Short text may be read
in full. For longer text, inspect headings and previews, then request relevant
blocks. All index pages remain accessible; a preview or search miss is not proof
that exclusions or contradictory evidence are absent elsewhere.

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

Run from the skill root with an absolute draft/map path. `ISSUE` is the canonical
map id or an unambiguous display identifier; use the canonical id across sources
with colliding identifiers.

```sh
just inspect MAP.json
just inspect MAP.json "" 20
just inspect MAP.json ISSUE
just inspect MAP.json ISSUE 20
just read-issue MAP.json ISSUE BLOCK
just read-issue MAP.json ISSUE BLOCK OFFSET
just search-issue MAP.json ISSUE 'literal source text'
```

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
just inspect "$MAP" | jq '.items[] | {id, identifier, scope}'
just search-issue "$MAP" "$ISSUE" "$QUERY" | jq '{total, nextOffset, items}'
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
