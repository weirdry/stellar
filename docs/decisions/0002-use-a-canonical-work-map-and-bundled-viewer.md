# ADR-0002: Use a canonical work map and bundled viewer

- Status: Accepted
- Date: 2026-09-12
- Owner: Stellar maintainer

## Context

The accepted prototype provides a useful tree, graph canvas, and inspector,
but embeds one report's labels, metadata, and shortcuts. A reusable agent skill
needs stable visual output from different inputs. The public repository cannot
contain its source organization's work records or data-bearing derivatives.

## Decision

Implement one vertical path: validated work-map JSON → standalone HTML → browser
exploration. Use Node-native ESM JavaScript for the CLI, JSON Schema with Ajv
and semantic checks for input, and the existing vanilla JavaScript/SVG visual
implementation. The agent authors data; reusable code owns the UI.

Define schema version 1 directly as an unreleased contract. Keep one relation
list and derive parent/context presentation from it. Declare unknown context
explicitly rather than inventing status or silently dropping endpoints.
Classification has one primary category per in-scope issue, with rationale and
origin; source project labels do not prescribe taxonomy. No prototype format
adapter or compatibility chain becomes a product dependency.

Use entirely invented public examples for test and CI. Original snapshots may
only support private local regression. Generated artifacts are as sensitive as
their inputs. Validate before a same-directory temporary write and rename so
invalid generation cannot replace the last usable report.

## Consequences

Rendering and validation are executable without a backend, live Linear
connection, React, or Archify. Browser dependencies are development-only.
The Node-native test runner is sufficient for the CLI; Chromium checks are a
separate named gate. There is no compiled bundle or published package to build.

Fixed visual rules are deterministic for the same ordered input and renderer;
fonts and viewports may differ. The initial taxonomy is two levels. The UI is
Korean. Skill instructions, source collection, override persistence/refresh,
localization, license, and distribution remain follow-up work.

Boundary classification: unreleased — corrected in place.
