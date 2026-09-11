# 6. Runtime view

State: **As-built**

## Validate and generate

1. The caller supplies a work-map JSON file and an output HTML path.
2. The CLI parses JSON and validates shape, identities, references, classification,
   relation semantics and URLs. Errors identify the field and repair.
3. The renderer reads its own shell, style and script relative to its module.
4. It escapes the title and embedded JSON, then replaces the template slots once.
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
purpose-based work. Issue selection shows its direct registered neighbors and
classification path; filtered-out and context issues are marked as context.
Collapsed edges retain actual source issue pairs for inspection. Target overlays
combine existing classifications without inventing relations. Navigation history
is in memory; local storage retains only the theme preference.

## Source collection and refresh

State: **Target**

The host agent will collect source facts and relevant context, record freshness
and lookup limits, classify the work, and invoke the validated generation path.
Collection and saved classification edits are not implemented. Refresh must
preserve explicit user decisions according to an eventual declared merge rule.
No background worker, continuous sync, or persistent service exists.
