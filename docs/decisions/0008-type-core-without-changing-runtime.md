# ADR-0008: Type the core without changing the runtime

Status: **Proposed**

Date: 2026-09-21

## Context

The accepted language direction after the
[native experiments](../validation/2026-09-21-standalone-normalize-comparison.md)
retains Node, excludes Go from current candidates and defers Rust migration.
Static safety remains a separate need: the core and CLI currently use unchecked
JavaScript, while JSON Schema and semantic validators guard runtime inputs.
[Issue #33](https://github.com/weirdry/stellar/issues/33) requests a plan, not the
conversion itself. This proposed decision records the design for that review.

## Decision

Adopt strict TypeScript for the complete core/CLI path first. Keep canonical
JSON schemas as contract owners and derive static declarations from them;
runtime validation remains mandatory. Execute erasable source through contributor
Node 24 tooling, run a separate no-emit compiler check, and use esbuild to produce
the same installed JavaScript entry point. The
[adoption plan](../development/typescript-adoption.md) owns exact scope, proposed
toolchain, narrowing rules, source consumers and implementation acceptance.

Defer viewer and existing tooling/test source conversion while updating callers
needed by the typed core. Do not describe the whole repository as type-checked.
Keep [ADR-0006](0006-distribute-a-node-ready-skill.md)'s Node-ready distribution;
no native binary or additional installed-runtime dependency is introduced.

## Alternatives

- Checking JavaScript with annotations would retain current filenames but does
  not match the chosen TypeScript source direction. It is not the completion
  criterion for this plan.
- Handwriting wire types separately from schemas creates competing contract
  definitions. Replacing the existing schemas with a new schema library also
  broadens the change beyond source typing.
- Converting viewer, all tests and research tools at once expands scope without
  completing the core boundary sooner. Keep those exclusions explicit.
- A separate emitted source tree or runtime TS loader adds resolution/build
  machinery where pinned Node already executes the required erasable syntax.

## Consequences

Contributors gain a compiler/linter/generator maintenance obligation and must
narrow unknown input rather than suppress diagnostics. Generated declarations
remain an approximation of runtime rules, with deterministic drift checks.
Runtime speed, release and installation acceptance do not follow from type
checking. Published version-1 contracts and saved files remain unchanged.

This ADR stays Proposed during plan review. Approval may accept the design while
implementation remains Target; neither state claims a converted source tree.
