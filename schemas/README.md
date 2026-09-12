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
| `sources`     | Source instances with provider, namespace, query scope, timestamp, coverage and notes |
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
limitations belong in each source’s `notes` and structured `coverage` and are visible in help.
For `detail: unqueried`, the label is a generated placeholder, not a source
status: the viewer derives its displayed text from the current `locale`.
Full-detail status labels, including unknown source statuses, remain literal.

Issue metadata may include `description`, `url`, assignee, assignee ID, project, team,
priority label, labels, and timestamps. Unavailable optional values can be
omitted; nullable metadata may use null. URLs must be absolute HTTP(S) without
credentials; Unicode paths are supported. Document references may point below
the report directory or to HTTP(S) pages. Parent traversal, absolute local
paths, executable schemes, and credential-bearing URLs are rejected. Attachments
are links, not copied files or automatically fetched images.

## Source identity and capture

`sources` contains one entry per provider namespace, not one per query page.
`id` is a local key, `provider` identifies the system, `name` is its display name,
and `namespace` identifies its workspace/repository. The `(provider, namespace)`
pair is unique. Each source has its own `scope`, `snapshotAt`, `coverage`, and
`notes`; mixed timestamps are not collapsed into a supposedly atomic snapshot.
Provider/namespace values are canonicalized by the collecting host as described
in [capture guidance](../references/capture.md).

Each issue has a globally unique internal `id`, a declared `sourceId`, a
source-native `nativeId`, and a human-facing `identifier`. `(sourceId, nativeId)`
must also be unique. Identical display numbers across repositories are valid.
The viewer qualifies repeated identifiers with their namespace, preserves full
source provenance in the inspector/search/help, and derives its header from the
sources' display names. Internal graph/edge references always use `id`.
Cross-source endpoints are allowed when the relation is actually registered;
co-membership in a category or a URL mention is insufficient evidence.

`just normalize CAPTURE DRAFT` converts Linear connector and GitHub REST issue
records using [normalize.js](../lib/normalize.js). The
[capture schema](capture.schema.json) references the canonical metadata definitions.
The output uses this same work-map shape, with empty taxonomy and unclassified
issues. Only missing classifications are allowed at that stage. Author domains,
categories, rationales and targets, then validate and render. Normalization
preserves original facts, translates relation direction, and resolves aliases
from all detail and endpoint observations before creating issues and relations.
Unfetched UUID/identifier aliases share one unknown context regardless of input
order. Different explicit native IDs cannot share one identifier within a source;
normalization rejects that conflict instead of redirecting an edge. It does not authenticate,
fetch, interpret prose, infer dependencies, or silently choose a category.

Linear normalized status uses recognized `statusType` values, retaining the
original label; absent or unsupported types remain unknown. GitHub `open` maps
to unstarted, `closed/completed` to completed, `closed/not_planned` to canceled,
`closed/duplicate` to duplicate, and other closed reasons to unknown. The native normalizer does not use project
columns or labels to guess progress. Coverage is declared by the collecting host;
structural checks cannot independently prove pagination or source permissions.

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
During normalization, paths refer to the supplied capture's fields or relationship
observations, including failures found while validating the unwritten draft.
During work-map validation/rendering, paths refer to the supplied work map.
Parent-cycle diagnostics identify a relationship in the cycle.
JSON syntax errors do not echo input excerpts. A failed render preserves the
previous output; successful generation uses a same-directory temporary file
and rename. Rendering over the input path or its symlink alias is rejected.

Real snapshots and their derived input JSON remain local. Public examples and
CI must use independent synthetic work rather than renamed source data.

## Saved state and choices

[State](state.schema.json) reuses the canonical work-map contract and may contain
a draft whose only map validation failures are missing assigned classifications.
Its `memory` stores source identities, display identifiers, classifications,
targets with independent origin, and last full title/body evidence. Taxonomy lives
in `map.domains` and `map.categories` and retains groups used by absent decisions.
`changes` describes new, returned, updated, not-observed and review-needed work.
It is a snapshot comparison, not source activity history.

[Choices](choices.schema.json) contains optional domain/category upserts and issue
updates selected by the current map's internal `issueId`. The command determines
agent/user origin; source fields cannot be supplied as choice fields. Neither
contract is a replacement viewer format. Only `state.map`, emitted as
`work-map.json`, enters HTML. See [continuity](../references/continuity.md).
