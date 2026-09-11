# 1. Introduction and goals

State: **Target**

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

## Current implementation

State: **As-built**

The repository implements a validated work-map JSON to standalone HTML path,
a reusable SVG viewer, synthetic examples, Node tests, and browser checks.
Contribution guidance, locked tooling, documentation checking, hooks and hosted
CI support development. Collection and a callable skill remain Target. See [development](../development/README.md) and
[validation](../validation/README.md).
