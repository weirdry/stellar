# 9. Architecture decisions

State: **As-built**

Accepted decisions are indexed in [the ADR history](../decisions/README.md).

| Decision                                                                                                                 | Current effect                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [ADR-0001: Adopt repository-owned tooling and canonical documentation](../decisions/0001-adopt-repository-foundation.md) | Retains the foundation and skill/viewer boundary; profile and upstream policy authority are superseded by ADR-0007    |
| [ADR-0002: Canonical work map and bundled viewer](../decisions/0002-use-a-canonical-work-map-and-bundled-viewer.md)      | Implements the first validated JSON-to-HTML path with private-data boundaries                                         |
| [ADR-0003: Work-map language and Stellar identity](../decisions/0003-bind-viewer-language-to-the-work-map.md)            | Separates agent-authored language from bundled UI copy and derives the owner’s Stellar name                           |
| [ADR-0004: Source-aware agent skill](../decisions/0004-bundle-a-source-aware-agent-skill.md)                             | Bundles host collection guidance and native normalization with multi-source identity and provenance                   |
| [ADR-0005: Preserve classification on refresh](../decisions/0005-preserve-classification-on-refresh.md)                  | Separates private remembered choices from current source facts and protects explicit user decisions                   |
| [ADR-0006: Distribute a Node-ready skill](../decisions/0006-distribute-a-node-ready-skill.md)                            | Defines MIT licensing, GitHub installation and a reproducible bundled runner                                          |
| [ADR-0007: Own the canonical documentation policy](../decisions/0007-own-canonical-documentation-policy.md)              | Defines repository-owned policy and the stellar-arc42-v1 documentation profile, preserving ADR-0001's other decisions |
| [ADR-0008: Type the core without changing the runtime](../decisions/0008-type-core-without-changing-runtime.md)          | Implements strict schema-derived core/CLI types while retaining Node and runtime validation                           |

This chapter is the current-view index. Accepted ADRs preserve rationale;
future consequential changes add a new decision and update the current view.
[ADR-0009: Type all maintained sources](../decisions/0009-type-maintained-sources.md)
extends static coverage to viewer, tests and tools while preserving generated
JavaScript delivery and frozen experiments.

An Accepted ADR can describe a Target that is not implemented yet.

## Source-language decision

State: **As-built**

[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) is Accepted.
The complete core/CLI and type tooling use strict TypeScript with schema-derived
contracts; Node-ready distribution and runtime validation remain intact.
The [implementation guide](../development/typescript-adoption.md) identifies
actual owners and active checks, including the viewer/test/tooling coverage
completed under ADR-0009. The
[dated record](../validation/2026-09-23-typescript-core.md) owns execution evidence;
source conversion does not establish release or installation acceptance.
