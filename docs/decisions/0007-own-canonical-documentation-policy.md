# ADR-0007: Own the canonical documentation policy

Status: **Accepted**

Date: 2026-09-19

## Context

[ADR-0001](0001-adopt-repository-foundation.md) established the repository
foundation using an externally named documentation profile and upstream
engineering references. The current rules need to be understandable and
maintainable from this repository, including their diagram and evidence policy.
Changing that authority requires an explicit decision while preserving the
original foundation's historical rationale.

## Decision

Use the repository-owned [documentation policy](../development/documentation.md)
and `stellar-arc42-v1` profile. The local [engineering standards](../development/standards.md)
index the authorities for each concern. Changes are reviewed here; there is no
automatic synchronization with external standards.

This decision supersedes only ADR-0001's external-profile selection and upstream
engineering-policy authority. Its self-contained contribution rules, locked
tooling, truthful checks, one L0 corpus, source ownership and product/privacy
boundaries continue to apply. ADR-0001's text remains historical; its link to
the mutable standards document now leads to the current policy index, not a
snapshot of the earlier reviewed sources.

Maintain Archify JSON, delivered HTML and exported dark SVG together. Keep
structural checks, source-based semantic review, browser measurements and actual
image review as separate evidence, with exact artifact identities recorded.
The detailed procedure belongs to the policy and diagram guide.

## Consequences

Contributors need only the local rules to understand applicable obligations.
Maintainers own their accuracy and must update the current view and relevant
checks together. Historical provenance remains available in ADR-0001 and Git
history; the ADR index and chapter 9 identify this partial replacement.

The profile identifies documentation rules, not a product wire format. This
decision does not change released schemas, rewrite stored state, introduce a
migration or alter development/release boundaries.
