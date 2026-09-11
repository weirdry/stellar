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

## Skill and refresh

State: **Target**

Package the functioning tools with collection/authoring guidance and bounded
repair instructions. Source collection adapters, classification continuity,
user overrides, and refresh merge rules still need implementation. Deterministic
rendering does not by itself preserve user decisions across newly authored inputs.
