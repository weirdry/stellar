# 9. Architecture decisions

State: **As-built**

Accepted decisions are indexed in [the ADR history](../decisions/README.md).

| Decision                                                                                                                 | Current effect                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [ADR-0001: Adopt repository-owned tooling and canonical documentation](../decisions/0001-adopt-repository-foundation.md) | Defines the foundation and preserves the accepted skill/viewer boundary                             |
| [ADR-0002: Canonical work map and bundled viewer](../decisions/0002-use-a-canonical-work-map-and-bundled-viewer.md)      | Implements the first validated JSON-to-HTML path with private-data boundaries                       |
| [ADR-0003: Work-map language and Stellar identity](../decisions/0003-bind-viewer-language-to-the-work-map.md)            | Separates agent-authored language from bundled UI copy and derives the owner’s Stellar name         |
| [ADR-0004: Source-aware agent skill](../decisions/0004-bundle-a-source-aware-agent-skill.md)                             | Bundles host collection guidance and native normalization with multi-source identity and provenance |
| [ADR-0005: Preserve classification on refresh](../decisions/0005-preserve-classification-on-refresh.md)                  | Separates private remembered choices from current source facts and protects explicit user decisions |

This chapter is the current-view index. Accepted ADRs preserve rationale;
future consequential changes add a new decision and update the current view.
An Accepted ADR can describe a Target that is not implemented yet.
