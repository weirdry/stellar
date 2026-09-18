# Canonical documentation policy

Authority: **Canonical**

Scope: **Stellar engineering documentation**

Documentation profile: **stellar-arc42-v1**

## Ownership and structure

The [authority map](../README.md#authority-map) assigns one owner to each concern.
The twelve chapters in [architecture](../architecture/README.md) are one L0
whole-system current view. A directory, library, CLI command, or viewer component
does not create an independently governed L1 system. Add a deeper corpus only
when a real independent boundary needs one; link it from its owning L0 chapter.

Canonical means authoritative for a concern, not implemented or immutable.
Code, schemas, configuration, and locks own executable facts. Architecture owns
the explanation of responsibilities, boundaries, invariants and their rationale.
Link exact inventories, versions, field definitions and commands to their owners
instead of maintaining competing copies. Historical records and issue discussions
must not be necessary to understand the current system.

Keep all twelve chapters, even when a chapter is brief. Each declares a default
state; a subsection with another state declares it explicitly. A diagram inherits
its section's state. Mixed current/future diagrams must visibly distinguish the
states and cannot imply that a proposed participant already exists.

## Claim and decision lifecycle

| State      | Meaning and required support                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------- |
| As-built   | Implemented or observed behavior, linked to its owning code, tests, configuration or dated evidence |
| Target     | Accepted direction with remaining implementation; identify the accepted decision and gap            |
| Open       | Undecided question or unverified claim; state what evidence or decision would resolve it            |
| Deprecated | Historical behavior with a replacement or retention/removal rule                                    |

Acceptance of an ADR is a decision, not implementation evidence. ADR statuses
remain Proposed, Accepted, Superseded, Deprecated and Rejected. Preserve accepted
decision history. For a consequential change, add a replacement ADR and update
the current view; do not turn every correction, diagram, or unreleased
implementation detail into an ADR or migration program.

Update affected chapters in the same change as a responsibility, contract,
invariant, runtime, deployment, security or quality change. Promote claims to
As-built only after reviewing their owner. Record dated observations and limits
under [validation](../validation/README.md). Add runbooks when actual operations
and recovery procedures exist. Repository checks, hosted CI, browser review,
publication, installation and user runtime acceptance remain separate claims.

## Engineering diagrams

Use Archify for new or substantially revised diagrams. Choose the notation for
the question: context/boundaries, ordered interactions, artifact movement,
branching workflow, or lifecycle/failure states. A diagram is useful when it
explains something the prose or a table does not make clear; every chapter does
not need one. Use several focused views instead of one unreadable whole-system
picture.

Preserve meaningful participants, arrow direction, payload or protocol,
ordering, branch conditions, persistence, failure and recovery behavior. Label
what an arrow means. Distinguish source facts from interpretation, source reads
from local processing, saved files from renderable maps, and local validation
from release or runtime proof. Diagrams summarize their linked owning sources;
they do not override them. Do not remove important conditions merely to satisfy
a layout checker.

Each maintained diagram has colocated JSON source, delivered HTML and a static
SVG under [architecture/diagrams](../architecture/diagrams/README.md). Embed the
SVG in its owning Markdown section, with adjacent links to the HTML and JSON.
Export the SVG from that exact HTML through the repository script; do not
redraw it or independently regenerate an illustration. The artifact manifest
records the generator version, hashes and HTML size. SVG images use the dark
palette. HTML starts dark unless a URL or saved user choice selects another
theme. The repository build applies this default reproducibly and checks the
final HTML; both generator and final artifact hashes are retained. Generated
views are never edited manually. Rebuild after a source, presentation adapter
or generator change, then review again.

The [diagram guide](../architecture/diagrams/README.md) owns reproducible commands,
the reviewed Archify version and the source-to-artifact consistency check. Archify
is a contributor documentation tool, not a Stellar runtime dependency. Routine
CI verifies committed artifacts without downloading or executing a user skill.
Use a separately documented Mermaid fallback only when Archify is unavailable,
execution is constrained, or the notation cannot express the required meaning.

## Completion and evidence

Record these separately for a diagram change:

1. **Structural generation:** source validation, all nine showcase artifact
   checks, zero composition errors/warnings, and the exact delivered HTML hash.
2. **Semantic review:** linked implementation owners, participant/edge meaning,
   conditions and failure/recovery limits checked against them.
3. **Browser evidence:** the exact delivered HTML at the documented desktop
   viewports, both endpoint themes, containment and readability results.
4. **Perceptual review:** actual rendered images inspected for legibility,
   crossings, clipping, balance and correct meaning. An automated receipt whose
   visual review says pending is not this evidence.

Run `just docs-check`, `just diagrams-check`, and the normal repository gate.
The documentation checker enforces chapter/state/index/link structure; the
diagram checker detects stale or independently changed source/HTML/SVG sets.
Neither proves source semantics, complete browser interaction coverage, or
release readiness. Link the dated review record in the change handoff and state
skipped or failed checks explicitly. Keep bulky screenshots and tool receipts
in ignored local output; committed documentation contains only public synthetic
or system-level facts.
