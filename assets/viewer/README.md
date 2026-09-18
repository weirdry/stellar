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
stable during camera movement. Below a 490 CSS-pixel stage width, overview domains
use one column. A two-group area puts its groups on opposite horizontal sides,
leaving room for the area name and avoiding the former straight cross-area arrow
through both area centers. Row spacing includes the issue footprints of every
current group, even while collapsed, so successive expansions do not interleave
neighboring areas. Wider stages retain the multi-column grid. Palette order
follows authored domain order; font fallback and viewport may affect pixels.

Global-view labels, including target-focus labels, use measured bounds for each
text line. Empty space beside a short subtitle does not exclude another name.
Selected/in-focus labels are considered first, then area, group and issue names.
Within the same area-name priority, areas nearest a stage edge place first.
Their side candidates try the outward direction before consuming a neighbor's
space. Candidates sit above, below or beside their node, with at most 32 CSS
pixels of extra vertical clearance. Area names also try 16/32-pixel horizontal
shifts at the above/below anchors and a closer five-pixel side gap; all candidates
retain the same four-pixel collision margin. These bounded alternatives accommodate
fallback font metrics without fixing a platform-specific font or shrinking text. A candidate is rejected if its first text line is
closer to another dot than its owning dot (with a two-pixel tolerance).
This rule also constrains horizontal alignment at the stage edge: a name cannot
be moved into another node's space merely to keep it visible. Area names use
two compact lines on stages narrower than 500 CSS pixels. Wider stages balance
the name across up to three lines, or four on the 500–759 pixel middle grid,
using a bounded width that grows with the text. This preserves distinguishing
endings of longer names without reserving a broad rectangle beside every dot.
If the longer name cannot be placed, try its compact two-line form with the same
collision, control-clearance and owning-dot checks before hiding it. Both forms
are measured in the same batch; temporary measurement nodes are removed before
display or export. Names beyond the chosen capacity still use an ellipsis; full
names remain available in the tree, accessible name, tooltip and inspector. Redundant area subtitles
appear only above 20% zoom, while the count stays on the dot.

Every global geometry pass checks visible text against the stage and the actual
caption, navigation, minimap and control rectangles. Filter changes, Back,
selection, zoom and resize use the same constraint. Text with no clear,
unambiguous placement is hidden; the node, tree, accessible name, tooltip and
inspector retain its identity. Panning rigidly translates current placements,
so manual camera movement can still put content behind controls. DOM measurements
are batched before placement. Off-stage labels retain a nearby placement and
become visible when panning brings their node into view.
Neighborhood label placement and camera behavior are unchanged.

Automatic global fitting stops shrinking when node separation would no longer
support distinct area/group dots, focused issue hit targets and a two-line
area-name slot. Overview fitting does not force unfocused expanded issues to
their detail scale. Dense or
short views may therefore extend beyond the stage: pan, use the minimap, select
an area/group from the tree, or manually zoom out to explore them. Fit does not
promise to display every node and name simultaneously. This avoids turning a
short view into overlapping dots just to include the entire scene.
The F control is labelled "Reframe for readability" ("읽기 좋은 크기로 보기")
and its tooltip, overview hint and help explain that some areas may remain
off-screen. This wording does not change the camera behavior.
Area centers still remain fixed during expansion. Selecting a group fits the
group and its issues; its parent area remains in the scene but does not widen those camera
bounds. That same selection scope is used by Fit and resize. The selected group's
issue identifiers are eligible for placement below the usual 25% zoom threshold.

Parallel curves retain a minimum screen-space separation for pointer selection.
Relation labels that overlap nodes, node text, or another visible relation label
are suppressed and reconsidered on zoom; the underlying edges and inspector
details remain available.
On narrow global stages, source curves compare seven quadratic bends
against unrelated node dots and visible text lines. Disjoint control hulls are
rejected cheaply; remaining collisions use quadratic/rectangle intersections
instead of forty point samples per obstacle. The first clear candidate wins;
otherwise the candidate with the fewest obstructions wins. A pair
shares its bend, preserving parallel separation and reversed arrow direction.
Bends that leave the stage horizontally are penalized when both endpoints are
on screen. This reduces the single-column interference without changing source
relations, node positions, classification lines or neighborhood routing. It does
not guarantee obstacle-free edges for arbitrary graphs.
These are bounded placement rules, not a general graph-layout optimizer.

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
For unqueried context, the displayed status placeholder comes from the current
locale catalog. Changing the report locale relocalizes this UI text without
rewriting embedded input or translating full-detail source status labels.
For `classificationEvidence: previous-observation`, the inspector labels the
classification as based on an earlier observation in the selected locale. It uses
the runner's explicit notice, not an inference from unknown status; the rationale,
source status and detail remain separate. Current context classifications without
that notice do not acquire a historical label.

The header joins source display names (for example, Linear + GitHub). Each
source retains its own timestamp, query scope and coverage in help. Incomplete
coverage is indicated beside the header with a neutral label covering both partial
and unavailable lookups; help displays their distinct states. Repeated issue identifiers are qualified
by namespace in visible labels; internal graph keys remain separate. The inspector
shows full provenance, and search also matches source namespace/name. Multiple
repositories with the same issue number navigate independently.

Source relations and classification lines remain visually distinct;
a collapsed relation opens the underlying source pairs in the inspector.
`window.stellar.getState()` exposes scene diagnostics for browser tests, not
an editing or persistence API.

The source retains the prototype's visual language. Its private data, generated
reports, attachments, and tests containing real identities were not imported.
See [quality](../../docs/architecture/10-quality.md).
