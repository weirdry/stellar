# Bundled viewer

State: **As-built**

[shell.html](shell.html), [style.css](style.css), and [app.js](app.js) own the
fixed interface. The renderer embeds these resources and the validated input
in one HTML file. There is no browser framework, external font request,
Archify runtime, server, or dynamic code generation by the host agent.

The viewer derives presentation fields from the canonical issue classification
and relation list. It keeps a domain grid with radial subgroups, expands issues
from their subgroup, and uses a radial neighborhood for direct source links.
A cross-domain target view uses compact horizontal trees. Node positions remain
stable during camera movement. Palette order follows authored domain order;
font fallback and viewport may affect pixels. Small scenes keep subgroup labels
visible; dense scenes reveal labels as the user zooms.

Search, synchronized tree/graph selection, status and target filters, relationship
toggles, history, pan/zoom/fit, minimap, themes, keyboard controls, mobile drawers,
and standalone SVG export are implemented. Local storage keeps only a theme
preference. Navigation history is bounded in memory and is not a saved edit.
The fixed UI is Korean. Authored content and taxonomy are data-driven.

Context issues stay outside totals. Missing details must be explicitly declared
in input. Source relations and classification lines remain visually distinct;
a collapsed relation opens the underlying source pairs in the inspector.
`window.stellar.getState()` exposes scene diagnostics for browser tests, not
an editing or persistence API.

The source retains the prototype's visual language. Its private data, generated
reports, attachments, and tests containing real identities were not imported.
See [quality](../../docs/architecture/10-quality.md).
