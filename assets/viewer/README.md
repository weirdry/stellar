# Bundled viewer

State: **As-built**

[shell.html](shell.html), [style.css](style.css), [app.js](app.js), and the
[ko](locales/ko.json)/[en](locales/en.json) message catalogs own the
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

Parallel curves retain a minimum screen-space separation for pointer selection.
Relation labels that overlap nodes, node text, or another visible relation label
are suppressed and reconsidered on zoom; the underlying edges and inspector
details remain available.
This is a text-visibility rule, not a general graph-layout optimizer.

Search, synchronized tree/graph selection, status and target filters, relationship
toggles, history, pan/zoom/fit, minimap, themes, keyboard controls, mobile drawers,
and standalone SVG export are implemented. Local storage keeps only a theme
preference. Navigation history is bounded in memory and is not a saved edit.
Reselecting the same issue or group does not add a redundant history entry.
Viewer shortcuts use unmodified keys and leave browser modifier shortcuts alone.
Enter selects a search result only while the result panel is open.
Fixed UI language is selected by the input's required `locale` (`ko` or `en`).
The renderer derives the document name from `owner` using the catalog's
`brand.title`; the header and SVG title derive that same name directly from
`owner`, preserving authored whitespace instead of reading the browser-normalized
`document.title` getter. Catalogs supply text, while the shell and script own
markup. Interpolated data is escaped at
the markup boundary. Browser language is not a fallback or override. The map
loads only its chosen catalog, embedded in the HTML. Source titles/status labels
are preserved. Updated dates use the selected locale with an explicit UTC zone.

Context issues stay outside totals. Missing details must be explicitly declared
in input. Search includes assigned and context issues, even outside the current
status filter. Inspector, search, tooltip and neighborhood captions distinguish
context from assigned work excluded by the status filter. Both can appear with
dashed borders without entering the current count. Targets are selectable when
at least one assigned issue carries them; context-only targets remain descriptive
tags with an explanation. Korean normalized status controls are translated;
source status labels remain unchanged.

Source relations and classification lines remain visually distinct;
a collapsed relation opens the underlying source pairs in the inspector.
`window.stellar.getState()` exposes scene diagnostics for browser tests, not
an editing or persistence API.

The source retains the prototype's visual language. Its private data, generated
reports, attachments, and tests containing real identities were not imported.
See [quality](../../docs/architecture/10-quality.md).
