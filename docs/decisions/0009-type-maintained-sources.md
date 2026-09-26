# ADR-0009: Type all maintained sources and generate browser JavaScript

Status: **Accepted**

Date: 2026-09-27

## Context

[ADR-0008](0008-type-core-without-changing-runtime.md) completed the core/CLI
conversion first. The viewer, behavior tests and ordinary tools still lacked
static coverage. [Issue #39](https://github.com/weirdry/stellar/issues/39) accepts
finishing that scope, including the active Python benchmark/profile scripts.

## Decision

Use strict TypeScript for all maintained behavior sources and configuration.
Keep schema-derived contracts; derive viewer data types from them and keep
browser display state separate. Check Node, DOM-only viewer and Playwright
programs separately with the same strict options. Generated assets and exact
historical experiment paths are explicit exceptions to the source inventory.
Shell setup, hooks and command orchestration remain shell.

Generate a committed standalone browser IIFE from `viewer/app.ts` before runner
manifest generation. Keep the installed Node runner, embedded HTML/CSS/SVG,
resource paths and existing JSON/state contracts. Read-only gates reject stale
viewer/runner output. No runtime TS loader, framework or native binary is added.

Port active measurement and attribution tools to Node TS. With maintainer
approval, system time replaces Python wait4 for direct-child CPU and peak RSS.
Record its coarser CPU precision and wall wrapper overhead; preserve the
original seeded shuffle ordering. Collect fresh baselines; preserve historical measurements and native
sources byte for byte. The [performance guide](../development/performance.md)
owns the protocol and archive reproduction boundaries.

## Consequences

The first-scope deferral in ADR-0008 is complete. Contributors edit TS rather
than generated browser JS and must regenerate both delivery artifacts when
needed. Generated HTML bytes change with the script, so historical verification
still requires the original renderer. Runtime validation, browser regression
checks and data-safety tests remain necessary; types alone do not prove behavior.

The [source guide](../development/typescript-adoption.md) owns current coverage.
The [validation record](../validation/2026-09-27-typescript-maintained-sources.md)
separates local/hosted checks from integration, publication and installation.
