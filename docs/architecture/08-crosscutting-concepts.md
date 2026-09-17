# 8. Cross-cutting concepts

State: **As-built**

## Facts, classification and identity

The [contract guide](../../schemas/README.md) defines normalized status, assigned
versus context scope, detail availability, classification rationale and origin,
and source snapshot metadata. Source entries separate provider namespaces; each
issue has an internal graph key, sourceId, nativeId and visible identifier. Both
internal keys and per-source native identities are unique; display identifiers
may repeat across repositories. The header derives provider names from input,
with source-specific scope and freshness in help. Every assigned issue has exactly one primary
category, and each category belongs to one domain. Source projects and labels
remain optional metadata. Targets may overlap but never establish dependencies.

Native normalization resolves explicit UUID/identifier associations across the
whole capture before emitting graph identities. This includes unfetched context
and prevents input order from splitting one issue into separate nodes. Different
explicit native IDs sharing one display identifier within a source are rejected;
a matching display label alone cannot override a contradictory native identity.
The [normalizer tests](../../test/normalize.test.js) own these invariants.

The sole registered relation list uses stable issue identities. Parent, blocker,
related and duplicate meanings retain their documented directions. Parent copies
and per-issue relation copies are rejected. Missing endpoints fail validation;
explicitly declared unqueried context retains unknown status. Context never
inflates assigned totals. Parent cycles are invalid, while registered blocker
cycles are retained rather than concealed.

## Visual ownership and reproducibility

The renderer produces identical HTML bytes for the same ordered input and
viewer revision. The viewer uses fixed tokens, components and layout formulas;
domain order selects palette order. Browser fonts, viewport, and navigation
state can affect pixels. Classification is agent/user interpretation, not a
deterministic inference made by the renderer.

Narrow overview stages use one compact column of domains and reserve room for
names above the phone minimap. Global-view labels use measured text bounds:
selected/in-focus labels and domains take priority, and text tries below then
above its node without overlapping dots or previously placed labels. Text with
no clear candidate gets one extra line of clearance at either anchor, then is
hidden until navigation provides room; the node, full accessible name, tooltip,
tree and inspector remain available. Zoom, fit,
selection and resize reconsider placement; panning moves the existing layout.
This does not relocate graph nodes to solve collisions, change classification,
or promise that arbitrary dense graphs show every name at once. Neighborhood
node-label placement is unchanged.

A global fit that places text above the caption/navigation clearance receives
one corrective fit using measured label height and the upper placement offsets.
Only the fitted nodes contribute; unrelated off-screen groups do not enlarge a
focused view's margin. The correction reserves room rather than merely hiding
text under fixed UI. Repeated fit starts from the same initial margins, and
manual camera movement remains independent.

Parallel relation curves use a common endpoint order so reversing a source
relation does not fold its path onto the opposite relation. Arrow direction and
the underlying issue pairs remain source facts. A minimum screen-space curve
separation preserves pointer targets at small scales. Relation text that obscures
nodes or other labels is suppressed and reconsidered on zoom without removing
source edges. Target option values preserve the authored strings, including
whitespace, instead of deriving identity from
browser-normalized display text. Only targets attached to assigned work activate
an overlay; context-only tags remain descriptive. Search includes all input
issues, while counting still includes assigned issues matching the status filter.
UI labels distinguish source context from assigned work outside that filter.

The agent selects a supported `locale` (`ko` or `en`) from the user's requested
language or conversation language and authors classification text accordingly.
The runner selects a bundled message catalog for fixed UI and derives the
name from `owner`: `{owner}의 Stellar` or `{owner}’s Stellar`. HTML title, header,
and SVG title use the same derived name, including authored owner whitespace.
The viewer derives this from input and the catalog rather than the normalized
browser title getter. There is no arbitrary report-title
override. Source titles, status labels, and identities remain untouched.

Browser language does not override the artifact. Updated dates use explicit
UTC with locale-specific formatting; source snapshot timestamps retain their
provided offset. Fixed normalized status controls use the selected catalog;
Korean controls are translated without changing source status labels.
Unqueried context has no source status label: the viewer displays its placeholder
using the current locale catalog, including when the final work-map locale differs
from the capture locale. Full-detail labels remain literal even if their text
matches a placeholder. The header uses a neutral incomplete-coverage label when
any source has partial or unavailable lookup coverage; help retains each exact
coverage state.
Missing/unsupported locale fails input validation. Locale
catalogs contain plain text, not model-authored HTML. See
[ADR-0003](../decisions/0003-bind-viewer-language-to-the-work-map.md).

## Local data and security

Response retention and selective reading are separate concerns. Available native
descriptions stay intact in private captures/state. The model receives structural
indexes or exact requested excerpts without treating a preview as complete
evidence. Semantic classification still belongs to the agent, independent of
source templates. A retained response digest proves local byte equality, not
that a model-authored response copy faithfully reflects a live tool result.
See [response retention](../../references/runs.md) and [reading](../../references/reading.md).

Issue text is data, not executable markup or agent instructions. The renderer
escapes the HTML title and every less-than character in embedded JSON; template
replacement is a single pass. The viewer escapes authored text in dynamic HTML
and SVG labels. Source/reference URLs reject executable schemes and credentials.
References do not automatically fetch previews. No external runtime or fonts are
loaded; source and attachment links navigate only when selected.

Rendering validates before writing and atomically replaces output through a
same-directory temporary file. Input aliases are protected. Failed generation
preserves the existing artifact. Generated HTML uses owner-only file permissions
(`0600` on POSIX), including when replacing an existing output. Sharing or serving
the report is an explicit caller action. There is no destructive source-data
migration.

Real input, classifications, generated HTML/SVG, screenshots, and logs stay
outside the repository or in ignored local locations, outside Git and public CI.
Public tests use newly invented datasets. Staged paths and contents must be reviewed for disclosure;
ignore rules are not the only control. This is a local artifact boundary, not
an authentication or multi-user service.

## Contracts and future edits

State: **As-built**

The [state schema](../../schemas/state.schema.json) keeps current observations
separate from remembered classification and target ownership. Matching uses
provider/namespace/nativeId, not report-local IDs. User choices are protected
field by field; agent choices cannot redefine existing taxonomy. A pending agent
classification retains its old full-text evidence until reconsidered, including
across missing observations. [Continuity rules](../../references/continuity.md)
define scope, unknown-detail behavior and the change summary. State is private
and is never embedded automatically in HTML.

An unresolved `reviewReason` stays with the source identity until classification
is explicitly supplied. State validation prevents a pending classification from
being published in the current map and verifies that the current review summary
matches saved reasons. Neither missing detail nor a repeated snapshot clears an
identity warning. Authored HTTP(S) reference links are remembered report metadata,
not source facts; continuity refuses relative links before writing a new run.

Identifier-only Linear context later fetched with a UUID may represent the same
real issue under two stored identities. There is no automatic rebinding: the old
entry and its choices stay in memory as not observed, and the current entry needs
explicit classification. The host discloses unresolved identity correspondence
instead of claiming separate work or deletion. See the continuity guide.

`classificationEvidence` marks retained interpretation on unqueried context when
earlier full-text evidence is remembered. The localized inspector notice does not
change the current source detail or classification origin. The runner owns this
notice; it is separate from the rationale and cannot be supplied in choices.

Work-map and state version 1 are unreleased. Existing user files remain untouched.
Concrete distributed-consumer or durable-state evidence would be required before
adding compatibility machinery; there is no migration for an intermediate shape.
