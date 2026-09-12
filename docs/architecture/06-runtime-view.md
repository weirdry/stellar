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

## Source collection and refresh

State: **Target**

The host agent will collect source facts and relevant context, record freshness
and lookup limits, classify the work, and invoke the validated generation path.
Collection and saved classification edits are not implemented. Refresh must
preserve explicit user decisions according to an eventual declared merge rule.
No background worker, continuous sync, or persistent service exists.
