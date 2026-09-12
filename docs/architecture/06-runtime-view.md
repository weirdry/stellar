# 6. Runtime view

State: **As-built**

## Validate and generate

1. The caller supplies a work-map JSON file and an output HTML path.
2. The CLI parses JSON and validates shape, identities, references, classification,
   relation semantics and URLs. Errors identify the field and repair.
3. The renderer reads its own shell, style, script, and selected locale catalog
   relative to its module.
4. It derives the owner’s Stellar name, escapes the title and embedded JSON,
   and replaces structural and localized text slots once.
5. It writes a uniquely named temporary file beside the output and renames it
   after successful generation. Validation or write failure preserves the previous
   usable report. The input or its symlink alias cannot be the output.
6. A local browser opens the artifact. All ordinary exploration is offline.
   Links navigate when selected; SVG export downloads the current visible canvas.

[render.js](../../lib/render.js), [CLI integration tests](../../test/core.test.js)
and [browser tests](../../test/browser/viewer.test.js) own this behavior.
The renderer does not modify input files or copy referenced attachments.

## Browser exploration

Status filters count assigned issues only. Domain/category selection expands
purpose-based work. Search includes assigned and context issues. Issue selection
shows its direct registered neighbors and classification path. Assigned work
outside the current status filter is labeled separately from source-declared
context; neither enters the current count. Context-only target tags are descriptive
and cannot activate a filter with no assigned target membership.
Collapsed edges retain actual source issue pairs for inspection. Target overlays
combine existing classifications without inventing relations. Navigation history
is in memory; repeated selection of the same node does not add another entry.
Local storage retains only the theme preference. Hidden search results cannot
be selected with Enter, and viewer shortcuts leave browser modifier keys alone.

## Source collection

State: **As-built**

The host follows [the skill](../../SKILL.md), exhausts the requested source query
or records partial coverage, retrieves descriptions and supported relations, and
writes native [capture JSON](../../references/capture.md). `just normalize`
first validates shared metadata and source declarations with the canonical
validator, before indexing sources or interpreting native records. It then
indexes source-qualified native/identifier pairs from all detail and
relationship observations. It rejects conflicting explicit native IDs, then
resolves aliases before emitting full issues, unknown context and deduplicated
relations in their original direction. An unfetched context referenced by UUID
and display identifier has one identity regardless of observation order.
Missing classifications are expected in the draft; other semantic failures stop
before output is written. Normalization diagnostics point back to captured fields
and relationship observations, including the native field supplying selected
context metadata and a parent observation within a cycle.
Missing or malformed GitHub URLs fail at `html_url` before repository resolution;
malformed assignee/label arrays and elements identify the corresponding capture
field with repair guidance instead of throwing an unstructured JavaScript error.
The agent edits only taxonomy/classification/targets,
then invokes validation and rendering. Normalization shares the renderer's atomic
writer and input-alias protection. Source-specific freshness and coverage remain
visible in the header/help; no source access occurs when opening the artifact.

## Saved classification and refresh

State: **Target**

Saved edits and refresh merging are not implemented. A future refresh must
preserve explicit user decisions through a declared rule. No background worker,
continuous sync, or persistent service exists.
