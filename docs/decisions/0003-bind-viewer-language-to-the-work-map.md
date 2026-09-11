# ADR-0003: Bind viewer language to the work map

- Status: Accepted
- Date: 2026-09-12
- Owner: Stellar maintainer

## Context

Stellar presents a person's work as a constellation of connected issues. An
arbitrary report title hides that identity. Asking an agent to regenerate UI
copy for each report also undermines the consistent bundled-viewer boundary.
The Korean-only starting point needs an explicit language choice for reuse.

## Decision

Require `owner` and `locale` in the work map. The renderer derives the name as
`{owner}의 Stellar` for `ko` and `{owner}’s Stellar` for `en`; the HTML title,
header, and SVG title share it. Remove the arbitrary top-level `title` field
from the unreleased version 1 contract.

The authoring agent chooses a supported locale from an explicit output-language
request, otherwise from the conversation. It writes classification labels,
descriptions, and rationale in that language. Original issue titles, status
labels, identities, and URLs remain source facts.

The runner validates the locale and embeds its repository-owned plain-text
catalog. Fixed controls, help, accessibility labels, and notifications come from
that catalog. The viewer owns markup and interpolation escaping. Browser
language does not override the result; missing or unsupported locale fails
validation. Region variants are normalized by the caller before rendering.

## Consequences

Language selection and authored analysis belong to the agent; fixed UI language
belongs to the runner. The same input and renderer produce the same artifact.
New languages require a reviewed catalog, schema support, and verification;
they do not require model-generated UI or another rendering implementation.

An English UI may contain Korean source titles, and vice versa. No automatic
translation of source facts or runtime language picker is introduced. Updated
dates use explicit UTC with locale-specific formatting; raw timestamps retain
their source value. Developer-facing CLI diagnostics remain English.

This decision resolves the localization follow-up in ADR-0002 while retaining
its canonical-data and bundled-viewer boundary. Skill invocation remains Target.

Boundary classification: unreleased — corrected in place.
