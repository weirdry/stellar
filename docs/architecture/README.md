# Stellar architecture

Authority: **Canonical**

Scope: **Stellar agent skill, work-map contract, and bundled interactive viewer**

Documentation profile: **stellar-arc42-v1**

This is the whole-system current view. The current repository implements the
local skill, host capture workflow, source normalizers and rendering core;
saved choices and requested refreshes are implemented; background sync remains Open.
It owns the engineering explanation, not original issue facts or empirical
claims about the user's projects.

## Explore the system

The [diagram guide](diagrams/README.md) indexes eight checked views with JSON
sources, explorable HTML and SVGs embedded in the chapters. Start with
[system context](03-context-scope.md), then follow
[first generation, refresh, persistence and verification](06-runtime-view.md),
[artifact ownership, rendering and brand assets](05-building-block-view.md), or
[skill delivery](07-deployment-view.md). The
[documentation policy](../development/documentation.md) defines this L0 profile
and the distinction between canonical authority and implementation state.

For a concrete reading path, follow the
[synthetic first-report-to-refresh walkthrough](../../examples/continuity-walkthrough.md),
then consult [failure responses](06-runtime-view.md#failure-response) and the
[glossary](12-glossary.md) as needed.

## Chapters

1. [Introduction and goals](01-introduction-goals.md)
2. [Constraints](02-constraints.md)
3. [Context and scope](03-context-scope.md)
4. [Solution strategy](04-solution-strategy.md)
5. [Building-block view](05-building-block-view.md)
6. [Runtime view](06-runtime-view.md)
7. [Deployment view](07-deployment-view.md)
8. [Cross-cutting concepts](08-crosscutting-concepts.md)
9. [Architecture decisions](09-architecture-decisions.md)
10. [Quality](10-quality.md)
11. [Risks and technical debt](11-risks-technical-debt.md)
12. [Glossary](12-glossary.md)

The [documentation index](../README.md) defines concern ownership and completion
rules. L0 is sufficient for the present scope; directories do not automatically
create independently governed L1 systems.
