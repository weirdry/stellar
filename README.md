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
Background synchronization remains **Target**. There is no backend. Installation
support is implemented; the first public release and promotion to `main` are pending.

## Install and use

With **Node.js 24.x** available, install the skill through the
[skills CLI](https://github.com/vercel-labs/skills):

```sh
npx skills add weirdry/stellar --skill stellar -g
```

This is the release installation command, available after the first promotion to
`main`. The installer fetches Stellar from GitHub; Stellar is not an npm package.
Choose your agent in the installer, or pass `--agent codex` or
`--agent claude-code`. Start a fresh host session if its skill list is cached.
Ask it to use Stellar, for example: “Use Stellar to map my assigned issues by
actual work purpose.” In hosts supporting `$stellar`, you can invoke it explicitly.
Source access uses the host's existing authenticated tools.

The installed skill includes a generated runner, its JavaScript dependencies,
schemas, viewer and guides. No developer checkout, mise, Just, pnpm, or Git hooks
are needed to generate reports. Node must remain available. The host resolves the
installed skill root and calls `node "$STELLAR_ROOT/bin/stellar.mjs"` from the
user's task directory. Do not run `just init` in an installed copy.

Use `npx skills update stellar -g` to check and apply updates through the installer.
Reports and saved state live outside the installation and are retained. To remove
the skill, use `npx skills remove stellar -g`; this does not delete report folders.
See [distribution and release](docs/development/distribution.md) for exact-ref
installs, contributor linking, validation, and the release procedure.

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

## Link a development checkout

After development setup, register this checkout for user-level skill discovery:

```sh
just skill-link
```

This links the checkout as `stellar` in the user's `.agents/skills` directory.
It refuses to replace another installation. The checkout and Node must remain
available. Run `just build-runner` after changing runner source or dependencies:
skill invocations use the generated bundle, while development Just commands
exercise source. This authoring link sees uncommitted changes; use an installed
copy for everyday use. Open a fresh host session if the skill list is cached.
Explicitly invoke `$stellar`, for example: “Map my Linear and GitHub issues by
actual work purpose.” Specify the person, sources, language or output location
when they differ from the conversation context or defaults.
See [the skill workflow](SKILL.md) and [capture format](references/capture.md).

The skill uses the output directory you specify, or one already established in
the conversation. Otherwise it creates each report in
`~/Documents/Stellar/<run-name>/`, independent of the task directory and skill
installation. Generation and refresh use fresh run directories and preserve
previous reports and saved state. The agent resolves the destination and passes
absolute paths to the CLI; direct CLI commands still require output arguments.
See [run locations and evidence](references/runs.md).
Automatic selection depends on the host; local evidence distinguishes explicit
invocation from discovery.

## Generate a map from a development checkout

The host can retain response files with `just retain-response INPUT NEW_FILE`
without printing their contents. After normalization, `just inspect MAP`,
`just inspect MAP ISSUE`, `just read-issue MAP ISSUE BLOCK` and
`just search-issue MAP ISSUE TEXT` provide bounded, template-independent views
over original descriptions. See [progressive reading](references/reading.md).
These helpers do not fetch data or turn a model-authored copy into source proof.

For a native capture, write agent decisions in the
[choices format](references/continuity.md#classify-a-first-draft), then use
`just classify-draft DRAFT.json CHOICES.json NEW_RUN`. The runner applies the
decisions and creates a complete map with refresh state; it does not propose
classifications. A runnable synthetic example is:

```sh
just normalize examples/mixed-capture.json outputs/mixed-draft.json
just classify-draft outputs/mixed-draft.json examples/mixed-choices.json outputs/mixed-run
just render outputs/mixed-run/work-map.json outputs/mixed-run/stellar.html
```

Choose a fresh run path when repeating this example. Already-classified examples
can be rendered directly:

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

These commands and the verification examples below use Node.js 24.x. Set
`STELLAR_ROOT` to the installed directory containing `SKILL.md`, and replace the
`/absolute/...` placeholders with your input and output paths.

`classify-draft` already saves the first run's state. Choose the operation needed
below; these are alternatives, not a sequence. Use a fresh run directory for each
invocation.

```sh
# Initialize state for an existing complete standalone map without state.
node "$STELLAR_ROOT/bin/stellar.mjs" remember \
  /absolute/map.json /absolute/new-run

# Record a user correction.
node "$STELLAR_ROOT/bin/stellar.mjs" revise \
  /absolute/state.json /absolute/choices.json /absolute/new-run

# Apply a fresh source snapshot.
node "$STELLAR_ROOT/bin/stellar.mjs" refresh \
  /absolute/state.json /absolute/capture.json /absolute/new-run

# Apply agent decisions while protecting user choices.
node "$STELLAR_ROOT/bin/stellar.mjs" classify \
  /absolute/state.json /absolute/choices.json /absolute/new-run
```

Each command writes a new private run directory; render its `work-map.json` and
keep its `state.json` for the next run. See the
[continuity workflow](references/continuity.md) for rules and choices examples.
Pending review survives context/absence until an explicit classification. Web
references are retained; report-relative references are rejected before a new run
is written, since local reference bundling is not implemented.

## Verify

For a map built from a supported native capture, check final artifact consistency:

```sh
node "$STELLAR_ROOT/bin/stellar.mjs" verify-run \
  /absolute/capture.json /absolute/map.json /absolute/report.html
node "$STELLAR_ROOT/bin/stellar.mjs" verify-run \
  /absolute/capture.json /absolute/map.json /absolute/report.html /absolute/state.json
```

Choose the invocation with state when one exists. The read-only command compares
normalized source facts, HTML-embedded data, the current bundled renderer and
the optional saved map. It does not establish source completeness, semantic
classification quality, preservation relative to a previous state, or visual
acceptance. See [run evidence](references/runs.md) for preserving inputs,
collection responses and verification results together.

## Development quality gates

From a development checkout, complete [developer setup](#start-development)
before running these repository checks with Just:

```sh
just ci
just browser-install
just browser-check
```

`ci` checks documentation, formatting, lint, bundle currency, and Node tests.
Browser installation is an explicit network operation. `browser-check` runs a
separate Chromium suite; GitHub CI runs both gates. Screenshots are optional local
evidence; neither a passing test nor a screenshot alone establishes visual acceptance.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) for contribution and issue-management
rules. Track development and maintenance in [GitHub Issues](https://github.com/weirdry/stellar/issues)
and the [Stellar Project](https://github.com/users/weirdry/projects/2), with table
and workflow-board views. The Project is private; issues and PRs are public.
Use the [work template](.github/ISSUE_TEMPLATE/work.md), write repository work in
English, and keep status and priority in Project fields rather than labels.
Private source data and user reports remain local.

Shared agent instructions live in [RULES.md](RULES.md). [AGENTS.md](AGENTS.md)
and [CLAUDE.md](CLAUDE.md) are one-line entry documents pointing to it. Edit
shared instructions in `RULES.md`; the product's `SKILL.md` continues to own
work-map generation and refresh.

## Navigation

- [Contributing](CONTRIBUTING.md)
- [Canonical documentation](docs/README.md)
- [Development commands](docs/development/README.md)
- [Standard adoption](docs/development/standards.md)
- [Architecture](docs/architecture/README.md)
- [Validation evidence](docs/validation/README.md)

## Repository boundaries

| Path                                   | Responsibility                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `bin/`, `lib/`                         | Response retention, progressive reading, normalization, validation, rendering and artifact consistency |
| `schemas/`                             | Authoritative input contract and semantic rules                                                        |
| `assets/viewer/`                       | Fixed HTML/CSS/JavaScript/SVG viewer                                                                   |
| `examples/`, `test/`                   | Entirely synthetic inputs and tests                                                                    |
| `SKILL.md`, `references/`              | Host collection, classification and repair workflow                                                    |
| `docs/`                                | Canonical architecture, decisions, and dated evidence                                                  |
| `scripts/`, `justfile`, tool manifests | Repository-owned development tooling                                                                   |
| `.githooks/`, `.github/`               | Contribution checks and hosted CI                                                                      |
| `local/`, `outputs/`                   | Ignored private inputs and generated artifacts                                                         |

Source hosting is public under `weirdry/stellar`. Follow the local contribution
policy: integration through `dev`, review branches for substantial work, and
validated promotion to `main`. Real snapshots, classifications, reports,
screenshots, and logs must never enter Git or public CI. Public fixtures are
invented from scratch, not anonymized copies of actual work.

## License

Stellar is [MIT licensed](LICENSE). Bundled dependency licenses are retained in
[THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). The license covers Stellar's
code and bundled synthetic examples; it does not grant rights to users' source
issues, captures, or reports.
