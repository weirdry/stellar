# Stellar

Stellar is an agent skill project that turns issue data into an
interactive work map: a classification tree, a relationship graph, and an issue
inspector. The agent interprets and classifies work; a bundled viewer owns the
visual components, layout rules, and interactions.

## Current stage

This repository contains the development and documentation foundation. The
prototype viewer, issue snapshots, rendering command, data schema, and callable
skill have not been imported or implemented here. The accepted product direction
is documented as **Target**, not as working functionality.

Stellar maintains its contribution rules in this repository, based on the
5010-dev commit and branch conventions. It also follows the repository-owned
Golden Path and canonical engineering documentation profile.

## Start development

The public repository is `weirdry/stellar` on GitHub. Use `dev` for development;
`main` is the validated baseline for promotion.

Install mise 2026.9.4 or a compatible newer release. From the repository root:

```sh
mise trust mise.toml
mise install --locked just
mise exec --locked just -- just init
mise exec --locked just -- just ci
```

With mise activated in your shell, use `just init`, `just check`, and `just ci`
directly. Initialization installs the locked support tools and enables the
repository-managed Git hooks. It does not create a commit or a remote.

The current tooling supports macOS arm64 and Linux x64 with Bash, Git, and Perl
available. The committed mise lock covers both platforms. Product/browser
support will be defined when the viewer is imported.

## Navigation

- [Contributing](CONTRIBUTING.md)
- [Canonical documentation entry point](docs/README.md)
- [Development commands and tooling](docs/development/README.md)
- [Organization standard adoption and source provenance](docs/development/standards.md)
- [Accepted architecture](docs/architecture/README.md)
- [Validation evidence](docs/validation/README.md)

## Repository boundaries

| Path | Responsibility |
| --- | --- |
| `docs/architecture/` | Canonical current view and accepted Target |
| `docs/decisions/` | Consequential decision history |
| `scripts/`, `justfile`, `mise.toml`, `mise.lock` | Repository-owned development tooling |
| `.githooks/`, `.github/` | Local contribution checks and repository-owned hosted CI |
| `assets/viewer/` | Reserved home for the reusable viewer |
| `schemas/` | Reserved home for the work-map input contract |
| `references/` | Agent-facing classification guidance |
| `examples/` | Synthetic, shareable examples |
| `local/`, `outputs/` | Ignored user input and generated reports |

The first product implementation should reproduce the existing prototype from
its snapshot, then render a different synthetic dataset without editing viewer
code. See the [quality scenarios](docs/architecture/10-quality.md).
