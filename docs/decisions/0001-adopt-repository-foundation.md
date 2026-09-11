# ADR-0001: Adopt repository-owned tooling and canonical documentation

- Status: Accepted
- Date: 2026-09-12
- Owner: ed, Stellar maintainer

## Context

Stellar begins as a repository following a reviewed interactive
issue-map prototype. The maintainer accepted an agent skill with bundled
rendering resources and requested the 5010-dev contribution, Golden Path, and
canonical-documentation conventions as the foundation.

The current central Golden Path is contract-backed and repository-owned. Its
retired executable control plane is not the starting point for a new project.
The [reviewed organization sources](../development/standards.md) define the
applicable rules and current profile.

## Decision

Write the applicable contribution rules directly in local CONTRIBUTING.md,
including Conventional Commits, `dev` integration, rebase review flow, and
eventual fast-forward `main` promotion. Provide exact locked
support tools, truthful Just commands, local hooks, and a thin local CI workflow.

Adopt one `5010-arc42-v1` L0 corpus with concern-based authority, state labels,
indexed ADRs, and structural/link checks. Keep other engineering standards
referenced upstream and executable implementation owned here. Contribution
rules remain self-contained so contributors can follow them without consulting
an external policy document.

Record the accepted skill/viewer architecture as Target. Import neither the
prototype nor private issue data as part of this foundation. Add native product
manifests, the input contract, callable skill, and their actual tests with the
first implementation. Do not add empty capability commands.

## Consequences

The foundation is reviewable and executable without another checkout or a
central runtime. It does not imply organization ownership, hosted enforcement,
product readiness, licensing, publication, or deployment. The initial branch
can be prepared locally without inventing a release or bootstrap commit.

No Stellar contract has been released or distributed. Development shapes can
evolve directly toward the accepted Target; this grants no authority to rewrite
user data. The first product proof is snapshot reproduction followed by a
different synthetic dataset using the same viewer implementation.
