# Work-map contract

State: **As-built**

[work-map.schema.json](work-map.schema.json) owns the JSON shape.
[validate.js](../lib/validate.js) owns cross-reference and semantic checks.
`schemaVersion: 1` is the first contract under development, not a release claim.
There are no readers or migrations for prototype intermediate shapes.

## Authoring

Start from [museum.json](../examples/museum.json) or
[seed-library.json](../examples/seed-library.json). Run `just validate INPUT`
before `just render INPUT OUTPUT`. Relative arguments resolve from the caller's
working directory when invoking `node bin/stellar.js` directly.

| Field         | Meaning                                                                               |
| ------------- | ------------------------------------------------------------------------------------- |
| `owner`       | Display name used in the fixed Stellar title                                          |
| `locale`      | Required fixed UI language: `ko` or `en`                                              |
| `source`      | Source name, offset-bearing `snapshotAt`, and scope/freshness/lookup notes            |
| `view`        | Initial status scope and filesystem-safe SVG export prefix                            |
| `domains`     | Ordered purpose-based areas, labels and descriptions                                  |
| `categories`  | Ordered subgroups; each references one domain and explains its basis                  |
| `issues`      | Source identities, title, status, scope, detail, optional metadata and classification |
| `relations`   | Sole authoritative list of registered issue relations                                 |
| `attachments` | Optional titled HTTP(S) or report-relative document links                             |

An issue's `scope` is `assigned` or `context`. Only assigned issues contribute
to totals. Every assigned issue requires one `classification` with an existing
category, rationale, and `origin` (`agent` or `user`). Context may be classified
if evidence supports it, but does not require a made-up category. Categories
reference their domain, so issue data does not repeat the domain or labels.
Targets are overlapping interpretation, not source relations. Source project
and labels are optional metadata, not taxonomy authority.

`detail: unqueried` requires `status.type: unknown`. Explicitly declare all
relation endpoints, even when only an identifier or title was available.
`full` means a source detail lookup was available, not that every optional
field or every relationship in the source system was fetched. Unknown statuses
remain unknown and can be explored through the dedicated filter. The status
label is preserved independently from its normalized type. Source lookup
limitations belong in `source.notes` and are visible in help.

Issue metadata may include `url`, assignee, assignee ID, project, team,
priority label, labels, and timestamps. Unavailable optional values can be
omitted; nullable metadata may use null. URLs must be absolute HTTP(S) without
credentials; Unicode paths are supported. Document references may point below
the report directory or to HTTP(S) pages. Parent traversal, absolute local
paths, executable schemes, and credential-bearing URLs are rejected. Attachments
are links, not copied files or automatically fetched images.

## Name and language ownership

The report name is derived by the runner: `{owner}의 Stellar` for `ko`, and
`{owner}’s Stellar` for `en`. Do not author a top-level `title`; issue titles and
attachment titles retain their separate meanings. The schema remains version 1
under development and is corrected in place.

The agent selects `locale` from an explicit user language request, otherwise
from the conversation language, and writes classification descriptions in that
language. It does not translate fixed controls or rewrite source issue titles,
status labels, identifiers, or URLs. Normalize a supported language variant such
as `ko-KR` or `en-US` to `ko` or `en` before authoring the input. Unsupported UI
languages need a reviewed bundled catalog; the renderer rejects unknown values
rather than silently guessing or having a model translate the interface.

The runner applies the chosen catalog to HTML language metadata, the document
name, header, controls, captions, tooltips, help, and SVG export. Locale does not
come from the machine, browser, or theme preference. Updated dates are formatted
in that locale using UTC; raw timestamps remain in the input. CLI diagnostics
remain stable English developer messages.

## Relationship semantics

| Kind        | Direction                                                     |
| ----------- | ------------------------------------------------------------- |
| `blocks`    | Prerequisite → dependent issue                                |
| `parent`    | Source parent → child; one parent per child, no parent cycles |
| `related`   | Undirected association explicitly registered in the source    |
| `duplicate` | Duplicate issue → original issue                              |

Related edges are unique regardless of endpoint order. Other edge kinds are
unique by ordered endpoints. Self-relations, duplicate identities, missing
endpoints, and contradictory parent structure fail validation. Registered
blocker cycles are allowed: the viewer must not rewrite source facts to make
the graph look orderly. Do not submit per-issue `relations` or `parentId` copies.

Classification links are derived by the viewer and are never source edges.
Collapsed graph edges retain their actual issue pairs for inspection. Target
membership never creates an edge. Arbitrary inferred association edges are not
part of this initial contract.

## Diagnostics and preservation

Validation returns `valid` and `diagnostics`. Each diagnostic has `code`, a
JSON-pointer-style `path`, `message`, and `fix`. CLI exit status is 0 for success,
1 for invalid input or execution failure, and 2 for invalid command usage.
JSON syntax errors do not echo input excerpts. A failed render preserves the
previous output; successful generation uses a same-directory temporary file
and rename. Rendering over the input path or its symlink alias is rejected.

Real snapshots and their derived input JSON remain local. Public examples and
CI must use independent synthetic work rather than renamed source data.
