# 1. Introduction and goals

State: **As-built**

Stellar turns a user's assigned work into an explorable map combining a
classification tree, a relationship graph, and contextual issue details.
The primary user is an individual trying to understand work areas, progress,
and dependencies across inconsistent source-system projects and tags.

The agent interprets the work and produces structured data. Reusable code
provides consistent typography, colors, components, layouts, and interaction.
The goal is repeatable artifact generation through an agent skill.

## Quality priorities

1. Traceable source facts and clearly identified inference.
2. Stable visual language and useful navigation across datasets.
3. Complete in-scope classification without inflating counts with context.
4. Local, inspectable output with reproducible generation.

The [quality scenarios](10-quality.md#product-quality-scenarios) translate these
priorities into observable behavior, evidence owners and verification limits.

## Current implementation

State: **As-built**

The repository implements a validated work-map JSON to standalone HTML path,
a reusable SVG viewer, synthetic examples, Node tests, and browser checks.
Contribution guidance, locked tooling, documentation checking, hooks and hosted
CI support development. The local skill guides collection through host tools;
Linear and GitHub native captures normalize into one source-aware contract.
Local saved choices and requested refreshes are implemented. Background
synchronization remains Open. GitHub skill installation with a bundled
Node runner is implemented; published versions are identified by immutable GitHub
release tags on validated `main`.
See [development](../development/README.md) and
[validation](../validation/README.md).
