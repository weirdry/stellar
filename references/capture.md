# Host capture format

[The capture schema](../schemas/capture.schema.json) reuses metadata from the
[canonical schema](../schemas/work-map.schema.json). See the wholly invented
[mixed capture](../examples/mixed-capture.json) for executable input.

A capture has `owner`, `locale`, `view`, `sources`, and `records`. Each record is
`{sourceId, scope, data, links?}`. `data` is the parsed native issue detail object,
not a tool wrapper or a rewritten summary. `scope: assigned` means membership in
the user's requested work set; related issues outside it are `context`.

Each source declares:

- `id`: a stable, safe local key, unique in this report.
- `provider`: `linear` or `github` for the native normalizers. Canonical maps may
  use other provider names without pretending these normalizers support them.
- `name`: display name, normally `Linear` or `GitHub`.
- `namespace`: source instance identity. Linear uses its workspace slug;
  GitHub uses `host/owner/repo` in lowercase, such as `github.com/example/atlas`.
- `scope`: the actual query, assignee and limits in readable language.
- `snapshotAt`: collection timestamp with an explicit offset. This is an
  observation timestamp, not a claim of an atomic database snapshot.
- `coverage.issues`: `complete` only after exhausting the requested query;
  otherwise `partial`. A deliberately bounded query can be complete within its
  stated scope; it cannot be described as all of a user's issues.
- `coverage.relations`: `complete`, `partial`, or `unavailable` for the supported
  relation lookups around in-scope issues. A failed/unsupported lookup is not an
  empty successful result. Explain context/detail limits in `notes`.
- `notes`: concrete pagination, detail, relation and freshness limitations.

Keep one full detail record per source-native issue. Deduplicate repeated pages
and endpoint detail; assigned membership wins over context. Preserve conflicting
source observations for investigation in local raw captures, then choose the
verified detail record deliberately. The normalizer rejects duplicate records.

Linear records use the connector's `id` (identifier), optional `uuid`, `title`,
`description`, `status`, `statusType`, `parentId`, and `relations` with `blocks`,
`blockedBy`, `relatedTo`, and nullable `duplicateOf`. Save separately queried
children in `links.children` as native reference/detail objects.

GitHub records use REST fields `node_id`, `number`, `html_url`, `title`, `body`,
`state`, `state_reason`, `assignees`, and `labels`. Exclude pull requests.
Save additional REST results as `links.parent` (issue or null), `links.children`,
`links.blocks`, and `links.blockedBy` (arrays). Omit a lookup on failure and mark
partial/unavailable coverage. Endpoint references must retain `node_id`, `number`
and `html_url`; the namespace is resolved from that URL. Declare another
repository in `sources` if a relation points there. Do not infer completion,
duplicate status, or dependency from prose or labels.

The normalizer uses source-qualified opaque keys and preserves display
identifiers separately. It indexes explicit native/identifier pairs from all
detail records and relationship references before building issues and edges.
Linear UUIDs are preferred when observed anywhere in the capture, including for
unfetched context; identifier-only and UUID-only references then resolve to the
same issue regardless of record or reference order. References with no observed
UUID association retain their supplied identifier as a provisional native
identity. Conflicting explicit UUIDs or GitHub `node_id` values for one identifier
within a source are rejected, even if one endpoint has not been fetched. GitHub
issue numbers may still repeat across repositories. This is a snapshot contract,
not a saved refresh identity rule.

Unqueried context prefers an observed display identifier over a bare native ID.
When repeated references supply different display labels, titles, or URLs for
that identity, the normalizer selects each field in lexical order to keep the
context metadata independent of capture order. This selection does not claim
which observation is newer. Full detail takes precedence over reference metadata.

Missing endpoint detail becomes an explicit unqueried context issue with unknown
status. It is not silently discarded or counted as assigned. Registered duplicate
edge observations are deduplicated; opposite directed edges retain direction.
Only classification may be missing in normalized drafts. Other shape, URL,
identity, and relationship failures stop normalization before writing output.
Normalization diagnostics point into this capture: copied fields use their native
field names, selected context metadata points to its originating reference, and
parent errors identify a captured relationship observation. No draft file is
needed to locate the input to repair; diagnostics do not quote issue text.

The unqueried status label in a draft is a placeholder. The viewer displays it
from the final work map's locale catalog, so changing that locale does not require
normalizing again just to relocalize this UI text. Full-detail source status
labels remain unchanged.
