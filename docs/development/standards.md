# Stellar engineering standards

Stellar owns its engineering rules in this repository.
The authority change and its limited replacement of the foundation decision are
recorded in [ADR-0007](../decisions/0007-own-canonical-documentation-policy.md).

| Concern                                                  | Authority                                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Language, issues, commits, branches, review and releases | [Contribution policy](../../CONTRIBUTING.md)                                                    |
| Agent instructions and product boundaries                | [Shared rules](../../RULES.md)                                                                  |
| Canonical documentation, state and diagram lifecycle     | [Documentation policy](documentation.md)                                                        |
| Architecture and accepted direction                      | [Architecture current view](../architecture/README.md)                                          |
| Tool setup and truthful local commands                   | [Development guide](README.md), [Justfile](../../justfile)                                      |
| Exact runtimes and dependencies                          | [mise configuration](../../mise.toml), [package manifest](../../package.json), repository locks |
| Hosted checks                                            | [CI workflow](../../.github/workflows/ci.yml) and its actual run results                        |
| Skill installation and publication                       | [Distribution guide](distribution.md)                                                           |

The single native root uses Node ESM JavaScript, exact runtime and dependency
selectors, frozen installation, Prettier, flat ESLint, the Node test runner and
separate Playwright browser checks. There is no TypeScript artifact requiring a
typecheck or published Stellar npm package. The installed runner is a reproducible
bundle generated explicitly and checked for currency; schemas and viewer assets
remain colocated authoritative inputs.

Quality gates are read-only. Installation, formatting, generation, publication
and deployment are separate actions. Tool configuration does not establish that
a command passed; a hosted workflow does not establish branch enforcement.
Hosting enforcement and dependency remediation ownership remain
[open concerns](../architecture/11-risks-technical-debt.md).

One L0 arc42 corpus is sufficient for the current skill and viewer. Archify is
used to explain that system, with JSON/HTML/SVG consistency checked locally.
It is not bundled into the product or needed to render a user's work map.

MIT licensing and GitHub-hosted skill distribution are implemented. `dev` has
no deployment target; validated `main` and immutable published tags define the
distribution boundary. [Release evidence](../validation/2026-09-19-v0.1.0-release.md)
separates publication, installation and host acceptance. Earlier dated records
and accepted ADRs retain their historical context; this document describes the
current local rules and does not create automatic policy synchronization.
