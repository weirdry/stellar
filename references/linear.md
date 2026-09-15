# Read-only Linear collection

Use the host's available Linear tools; tool names can differ by host. Inspect
current callable schemas before use. The supported capture mapping is the
Linear connector's issue JSON, not arbitrary GraphQL response envelopes.

1. Resolve the intended user (`get_user`, `me` only when the user means the
   connected account) and workspace. List the requested issues with
   `list_issues`, the explicit assignee and query filters, and archived behavior.
   Follow `hasNextPage`/`cursor` until the requested scope is satisfied. For a full
   query, exhaust pagination. For a requested recent-N sample, verify ordering
   and the selection boundary, retain that evidence, and state that more issues
   exist outside the sample; do not expand to the whole account.
2. Fetch every in-scope issue with `get_issue(includeRelations: true)`. Listing
   descriptions can be truncated, even when explicitly requested. Use full detail
   as retained evidence; use [progressive reading](reading.md) for classification.
   Preserve `statusType` alongside the exact status label.
   If unavailable, fetch the team's status definitions; do not guess a type from
   localized labels. Unknown stays unknown.
3. Preserve `parentId` and all four connector relation fields. `blocks` points
   outward, `blockedBy` inward, `relatedTo` is undirected, and `duplicateOf`
   points from the duplicate to the original.
4. Query children with paginated `list_issues(parentId: issue.id)` for each
   in-scope issue, without an assignee filter. `get_issue` does not establish that
   all children were found. Put them in that record's `links.children`.
5. Use available endpoint metadata to establish status and context; fetch direct
   detail when needed to explain or classify it. Preserve any description that
   is returned, even if the model reads only an excerpt. Mark
   these records `context` unless they were already in the requested set. A
   failed endpoint fetch may remain an unqueried placeholder; explain this in
   source notes. Do not recursively expand the entire workspace.

Follow [response retention](runs.md#prepare-and-retain-evidence) before querying.
The selected issue count does not bound the number or size of direct endpoints.
Record list-only observations and omitted/failed detail lookups honestly; do not
claim a full detail query occurred merely because normalized metadata is present.

Only claim complete relation coverage when parent, child, blocking, related and
individual duplicate lookups completed for the requested set. Incoming duplicate
relations may not be exposed by a connector: record that limitation and use
`partial` unless an authoritative reverse lookup was actually available. Do not
turn a missing reverse-lookup capability into a workspace-wide scan by default.

A user-requested sample or interrupted collection must identify its exact limits.
If source access is absent, request the missing connection or use a supplied
snapshot; never substitute the bundled synthetic example as the user's result.
