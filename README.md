# Stellar

Stellar presents a person's work as a constellation of connected issues: a classification tree,
a relationship graph, and an issue inspector. The agent interprets and
classifies work; bundled code owns typography, colors, layout, and interaction.

## Current stage

The local agent skill, Linear/GitHub capture normalizers, work-map contract,
validator, and standalone tree/graph viewer are implemented. A report can combine
multiple workspaces and repositories. The host agent collects and classifies;
Stellar code normalizes facts and renders the fixed interface. Local saved choices
and requested refreshes preserve user grouping while updating source facts.
Background synchronization remains **Target**. There is no backend or published package.

## Start development

Install mise 2026.9.4 or a compatible newer release. With Bash, Git, and Perl
available, run from the repository root:

```sh
mise trust mise.toml
mise install --locked just
mise exec --locked just -- just init
mise exec --locked just -- just ci
```

With mise activated, use Just directly. `just init` installs locked tools and
frozen pnpm dependencies and enables local hooks. Node 24 is pinned in mise;
pnpm is selected from `package.json` through the bundled Corepack. Tool locks
cover macOS arm64 and Linux x64.

## Use the local skill

After development setup, register this checkout for user-level skill discovery:

```sh
just skill-link
```

This links the checkout as `stellar` in the user's `.agents/skills` directory.
It refuses to replace another installation. The checkout and its installed
runtime dependencies must remain available; this is local authoring setup,
not a distributed package. Open a fresh host session if the skill list is cached.
Explicitly invoke `$stellar` and request the person, sources, language, and output
location, for example: “Map my Linear and GitHub issues by actual work purpose.”
See [the skill workflow](SKILL.md) and [capture format](references/capture.md).
Automatic selection depends on the host; local evidence distinguishes explicit
invocation from discovery.

## Generate a map

```sh
just validate examples/museum.json
just render examples/museum.json outputs/museum.html
just render examples/seed-library.json outputs/seed-library.html
```

Open the generated HTML in a browser. No server, credentials, or network access
is needed to explore it. Reference links and source links navigate only when
selected. Each HTML contains its input data: treat a real report as private.

The tree locates work by purpose. Selecting an issue reveals its direct
neighbors, including explicitly declared context outside the counting scope.
Search, status and target filters, relationship switches, history, pan/zoom,
minimap, light/dark themes, mobile drawers, and SVG export are included.
Each map is named `{owner}의 Stellar` in Korean or `{owner}’s Stellar` in
English. Set the input `locale` to `ko` or `en`; the renderer applies bundled
UI copy to the header, controls, help, graph labels, and SVG export. The agent
chooses the language and writes classification explanations; source issue titles
and status labels remain unchanged. Browser language never overrides the input.
Use [the input guide](schemas/README.md) to author a different map.

## Remember and refresh

After classifying a first map, `just remember MAP.json NEW_RUN` saves its state.
Use `just revise STATE.json CHOICES.json NEW_RUN` for a user correction and
`just refresh STATE.json CAPTURE.json NEW_RUN` for a fresh source snapshot.
`just classify STATE.json CHOICES.json NEW_RUN` applies agent decisions while
protecting user choices. Each command writes a new private run directory; render
its `work-map.json` and keep its `state.json` for the next run. See the
[continuity workflow](references/continuity.md) for rules and choices examples.

## Verify

```sh
just ci
just browser-install
just browser-check
```

`ci` checks documentation, formatting, lint, and Node tests. Browser installation
is an explicit network operation. `browser-check` runs a separate Chromium suite;
GitHub CI runs both gates. Screenshots are optional local evidence; neither a
passing test nor a screenshot alone establishes visual acceptance.

## Navigation

- [Contributing](CONTRIBUTING.md)
- [Canonical documentation](docs/README.md)
- [Development commands](docs/development/README.md)
- [Standard adoption](docs/development/standards.md)
- [Architecture](docs/architecture/README.md)
- [Validation evidence](docs/validation/README.md)

## Repository boundaries

| Path                                   | Responsibility                                               |
| -------------------------------------- | ------------------------------------------------------------ |
| `bin/`, `lib/`                         | Native capture normalization, validation and HTML generation |
| `schemas/`                             | Authoritative input contract and semantic rules              |
| `assets/viewer/`                       | Fixed HTML/CSS/JavaScript/SVG viewer                         |
| `examples/`, `test/`                   | Entirely synthetic inputs and tests                          |
| `SKILL.md`, `references/`              | Host collection, classification and repair workflow          |
| `docs/`                                | Canonical architecture, decisions, and dated evidence        |
| `scripts/`, `justfile`, tool manifests | Repository-owned development tooling                         |
| `.githooks/`, `.github/`               | Contribution checks and hosted CI                            |
| `local/`, `outputs/`                   | Ignored private inputs and generated artifacts               |

Source hosting is public under `weirdry/stellar`. Follow the local contribution
policy: integration through `dev`, review branches for substantial work, and
validated promotion to `main`. Real snapshots, classifications, reports,
screenshots, and logs must never enter Git or public CI. Public fixtures are
invented from scratch, not anonymized copies of actual work.
