# 4. Solution strategy

State: **As-built**

The working vertical path is work-map JSON → input validation → standalone HTML
→ browser exploration. The [schema](../../schemas/work-map.schema.json) defines
the shape, [validator](../../lib/validate.js) checks semantic references, and
[renderer](../../lib/render.js) embeds the bundled viewer and input. The viewer
consumes no source credentials or query mechanism.

Node-native ESM JavaScript retains the prototype's HTML/CSS/SVG implementation.
The agent supplies classifications and evidence; it does not regenerate CSS or
layout code. Owner, locale, timestamps, taxonomy, source facts, and optional
references are data. The renderer derives the Stellar title from the owner and
selects bundled UI messages from the explicit locale. Source links and reference documents are opened only by
user action. The first HTML generation path requires no Archify installation.

Archify remains a reference for typed authoring, fixed visual implementation,
and actionable diagnostics, rather than a product runtime dependency.
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
[verifier](../../lib/verify.js) compares supplied artifacts, keeping structural
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
