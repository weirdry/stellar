# 4. Solution strategy

State: **As-built**

The working vertical path is work-map JSON → input validation → standalone HTML
→ browser exploration. The [schema](../../schemas/work-map.schema.json) defines
the shape, [validator](../../lib/validate.ts) checks semantic references, and
[renderer](../../lib/render.ts) embeds the bundled viewer and input. The viewer
consumes no source credentials or query mechanism.

The Node ESM core/CLI and SVG viewer use TypeScript sources. Browser JavaScript
is generated and embedded with the existing HTML/CSS/SVG assets.
The agent supplies classifications and evidence; it does not regenerate CSS or
layout code. Owner, locale, timestamps, taxonomy, source facts, and optional
references are data. The renderer derives the Stellar title from the owner and
selects bundled UI messages from the explicit locale. Source links and reference documents are opened only by
user action. The first HTML generation path requires no Archify installation.

Archify generates the maintained [engineering diagrams](diagrams/README.md).
It is also a reference for typed authoring, fixed visual implementation and
actionable diagnostics. It is not a product runtime dependency.
See [ADR-0002](../decisions/0002-use-a-canonical-work-map-and-bundled-viewer.md).

## Skill and sources

State: **As-built**

[SKILL.md](../../SKILL.md) bundles a common workflow and source-specific retrieval
guides. The host collects native records and records lookup coverage. The CLI
normalizes them into an unclassified work-map draft. The agent adds purpose
classification; the existing validator/renderer owns the remaining execution.
Provider namespaces and source-native identities separate repeated issue numbers.
The agent reviews group membership against actual outputs and exclusions before
delivery. [Run guidance](../../references/runs.md) keeps collection evidence and
selected inputs locally inspectable across hosts. The read-only
[verifier](../../lib/verify.ts) compares supplied artifacts, keeping structural
consistency separate from the agent's semantic judgment and source access.
The viewer derives source labels and coverage from input. See
[ADR-0004](../decisions/0004-bundle-a-source-aware-agent-skill.md).

## Saved edits and refresh

State: **As-built**

[Continuity](../../references/continuity.md) uses a private saved state and fresh
run directories. The runner preserves explicit user grouping, retains absent
decisions outside the current map, and requires reconsideration of agent
classification when full issue text changes. Current facts come exclusively from
new normalization. [ADR-0005](../decisions/0005-preserve-classification-on-refresh.md)
records this separation. Background synchronization remains Open. MIT licensing
and the installable Node runner are implemented; see
[skill distribution](07-deployment-view.md#skill-distribution) for the current
installation and release boundary.

## Source language and runtime

State: **As-built**

All maintained core/CLI, viewer, test and development-tool sources use strict TypeScript with schema-derived declarations,
unknown-input narrowing and a read-only no-emit compiler gate. The
[implementation guide](../development/typescript-adoption.md) and
[ADR-0008](../decisions/0008-type-core-without-changing-runtime.md) define this
boundary. Runtime schema and semantic checks remain mandatory; static types do
not promise better runtime performance or certify untrusted JSON.

Node and generated JavaScript remain the delivery model. The viewer has a
separate DOM-only compiler configuration and generated-asset drift check.
[ADR-0009](../decisions/0009-type-maintained-sources.md) extends source coverage
while preserving the frozen native experiment sources and receipts.

The [standalone experiment](../validation/2026-09-21-standalone-normalize-comparison.md)
does not justify native executable distribution for the current workload. Go is
excluded from current candidates and Rust migration is deferred. Reconsidering
Rust requires a concrete latency, memory or installation problem that justifies
maintaining the selected OS/architecture targets. The archived prototypes are
research evidence, not an accepted alternative product runtime.

## Choices and trade-offs

These are the current consequences of accepted decisions. The ADRs retain their
original context, including follow-up work that has since shipped; the current
chapters and their executable owners establish what exists now.

| Choice                                                                   | Why it serves the product                                                                                                                            | Cost or boundary                                                                                                                                                                                | Decision and current detail                                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Agent-authored interpretation; fixed schema and viewer                   | Work can be grouped by purpose without regenerating the interface for each person. Code can check references and render the same input consistently. | Structural validity cannot establish whether a category or rationale is meaningful. The agent must read evidence and review membership.                                                         | [ADR-0002](../decisions/0002-use-a-canonical-work-map-and-bundled-viewer.md), [classification guide](../../references/classification.md) |
| Host-owned collection; source-qualified identities and explicit coverage | Existing host access can combine Linear and multiple GitHub repositories while retaining provenance and repeated issue numbers.                      | Permissions, pagination and relation support differ by host. A valid capture can still be incomplete; opening HTML never refreshes it.                                                          | [ADR-0004](../decisions/0004-bundle-a-source-aware-agent-skill.md), [collection](06-runtime-view.md#source-collection)                   |
| Standalone HTML with embedded data and SVG viewer                        | A report can be opened offline, copied and reproduced without a server or source credentials.                                                        | The artifact contains the report's data and needs the same privacy treatment as its inputs. Fonts and viewport affect pixels; dense views require navigation.                                   | [ADR-0002](../decisions/0002-use-a-canonical-work-map-and-bundled-viewer.md), [cross-cutting concepts](08-crosscutting-concepts.md)      |
| Explicit report locale and bundled text catalogs                         | The chosen language and owner-derived title travel with the report, independent of browser settings.                                                 | Only Korean and English are implemented. Source text remains literal, and each additional locale needs reviewed copy and browser evidence.                                                      | [ADR-0003](../decisions/0003-bind-viewer-language-to-the-work-map.md), [viewer guide](../../assets/viewer/README.md)                     |
| Private state with field-level user ownership and fresh runs             | User corrections survive refresh while facts come from the new capture. Earlier decisions remain available when issues are temporarily absent.       | The caller must select a state lineage and retain it. HTML alone cannot recover that memory; changed agent evidence can require review, and branches are not merged automatically.              | [ADR-0005](../decisions/0005-preserve-classification-on-refresh.md), [continuity guide](../../references/continuity.md)                  |
| One Node-ready skill distributed through GitHub                          | Users run a bundled runner without contributor dependencies or a custom installer.                                                                   | Users still need Node 24. Maintainers must keep the generated runner current and verify installation from the published tag; installation alone does not prove host discovery or source access. | [ADR-0006](../decisions/0006-distribute-a-node-ready-skill.md), [deployment view](07-deployment-view.md)                                 |

Archify applies the same separation of authored meaning and fixed presentation
to engineering documentation. Its build and review costs belong to contributors;
it does not enter report generation or installed-skill execution.
