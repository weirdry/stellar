# ADR-0004: Bundle a source-aware agent skill

Status: **Accepted**

Date: 2026-09-12

## Context

A deterministic viewer needs a reusable collection/classification workflow.
One person's work can span Linear and multiple GitHub repositories, where
visible issue numbers can repeat. A singular report source loses provenance
and encourages provider-shaped taxonomy. The existing development contract is
unreleased; no distributed consumer requires its intermediate singular shape.

## Decision

Bundle a root skill entry, focused source/classification references, and the
existing runner/viewer in one checkout. The host owns authentication, retrieval,
pagination and interpretation. Code normalizes Linear connector and GitHub REST
captures into a source-neutral draft, then validates and renders the completed
classification. The normalizer does not make network requests or classify work.

Represent one source per provider namespace with its own query scope, timestamp,
coverage and notes. Issues carry an internal graph key, sourceId, source-native
identity and visible identifier. Internal keys and source-native identity pairs
are unique; visible identifiers may repeat. Registered relation endpoints always
reference internal keys and can cross source namespaces when actually observed.
Shared taxonomy or text mentions never create dependency edges.

The viewer derives the header from source names and qualifies ambiguous issue
labels. The inspector and help retain full provenance and lookup limitations.
Keep schema version 1 and correct this unreleased contract in place. Do not add
an old-shape reader, migration, or compatibility fixture.

## Consequences

`just skill-link` supports local development discovery through a symlink and
refuses to overwrite another installation. The checkout and locked runtime must
remain available. Local explicit invocation is distinct from automatic selection,
a distributed skill package, and publication. License/channel decisions stay Open.

Coverage declarations depend on the collecting host; schema validation cannot
prove source pagination or permissions. Linear incoming-duplicate lookup and
GitHub related/duplicate semantics are explicit capability limits in the guides.
Unfetched endpoints remain unknown context. Existing user files are preserved;
newly authored inputs must follow the current contract. Saved overrides and
refresh merging are deferred until their actual user behavior is designed.
