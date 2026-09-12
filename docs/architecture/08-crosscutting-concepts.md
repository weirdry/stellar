# 8. Cross-cutting concepts

State: **As-built**

## Facts, classification and identity

The [contract guide](../../schemas/README.md) defines normalized status, assigned
versus context scope, detail availability, classification rationale and origin,
and source snapshot metadata. Every assigned issue has exactly one primary
category, and each category belongs to one domain. Source projects and labels
remain optional metadata. Targets may overlap but never establish dependencies.

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
Missing/unsupported locale fails input validation. Locale
catalogs contain plain text, not model-authored HTML. See
[ADR-0003](../decisions/0003-bind-viewer-language-to-the-work-map.md).

## Local data and security

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

Real input, classifications, generated HTML/SVG, screenshots, and logs stay in
ignored local locations, outside Git and public CI. Public tests use newly
invented datasets. Staged paths and contents must be reviewed for disclosure;
ignore rules are not the only control. This is a local artifact boundary, not
an authentication or multi-user service.

## Contracts and future edits

State: **Target**

Schema version 1 is unreleased and evolves in place. Saved overrides and refresh
merge rules are not implemented. Concrete distributed-consumer or durable-state
evidence would be required before adding compatibility machinery.
