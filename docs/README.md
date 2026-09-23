# Stellar documentation

This is the repository-local entry point for Stellar's engineering knowledge.

## Authority map

| Concern                                          | Owner                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Architecture current view and accepted Target    | [Architecture](architecture/README.md)                                                                                             |
| Implemented behavior and exact tool versions     | Repository scripts, configuration, and locks                                                                                       |
| Skill authoring and capture workflow             | [Skill entry](../SKILL.md), [capture guide](../references/capture.md)                                                              |
| Installed CLI identity, diagnostics and help     | [CLI guide](../references/cli.md), [command catalog](../lib/cli-help.ts)                                                           |
| Work-map input shape                             | [Work-map schema and semantic contract](../schemas/README.md)                                                                      |
| Saved choices and requested refresh              | [Continuity workflow](../references/continuity.md), [state contract](../schemas/state.schema.json)                                 |
| Local run evidence and artifact consistency      | [Run guide](../references/runs.md), [verifier](../lib/verify.ts)                                                                   |
| Fixed UI language and owner-derived naming       | [Bundled viewer and locale catalogs](../assets/viewer/README.md)                                                                   |
| Visual identity and brand assets                 | [Brand guide](brand.md), [Open Star SVG](../assets/viewer/stellar.svg), [README banner](../assets/brand/stellar-readme-banner.png) |
| Original issue facts                             | Source snapshot and source system; neither classification nor prose rewrites them                                                  |
| Classification decisions                         | Work-map rationale and origin; private state retains classification and target ownership                                           |
| Consequential decisions                          | [ADR history](decisions/README.md)                                                                                                 |
| Repository-wide agent instructions               | [Shared rules](../RULES.md), referenced by [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md)                                 |
| Development work scope, acceptance and progress  | [GitHub Issues](https://github.com/weirdry/stellar/issues), [Stellar Project](https://github.com/users/weirdry/projects/2)         |
| Commit, branch, issue, review, and release rules | [Stellar contribution policy](../CONTRIBUTING.md)                                                                                  |
| Contributor setup and command procedures         | [Development guide](development/README.md)                                                                                         |
| Dated results and limitations                    | [Validation records](validation/README.md)                                                                                         |
| Engineering standards and documentation policy   | [Engineering standards](development/standards.md), [documentation policy](development/documentation.md)                            |

GitHub Issues own agreed development work scope and progress; the Project is its
planning view. Repository documents and executable evidence own technical facts.
Chat, external trackers, and PR discussions provide context; the architecture
must remain understandable without them. Source issues rendered by Stellar are
product inputs, distinct from issues used to manage Stellar itself. When sources
disagree, identify the concern, verify its owner, and correct that owner rather
than creating duplicate truths.

Installation and release commands are maintained in the
[distribution guide](development/distribution.md).

## State vocabulary

- **As-built:** behavior verified against repository or observed evidence.
- **Target:** accepted direction with implementation still remaining.
- **Open:** undecided or unverified.
- **Deprecated:** historical behavior with an identified replacement or retention rule.

Canonical describes authority, not implementation status. ADR lifecycle is
separate: Proposed, Accepted, Superseded, Deprecated, or Rejected.

## Documentation completion

Update affected architecture in the same change as a responsibility, boundary,
invariant, runtime, deployment, or quality change. Add or supersede an ADR for
consequential decisions. Add runbooks only when real operations exist. Keep
generated contracts and their owning sources aligned. Dated verification belongs
in validation records; only verified claims move from Target to As-built.

The [canonical documentation policy](development/documentation.md) defines the
Stellar arc42 profile, same-change lifecycle and diagram review requirements.
[Architecture diagrams](architecture/diagrams/README.md) provide static SVGs,
explorable HTML, JSON sources and reproducible generation commands.

`just docs-check` enforces structure, state vocabulary, indexes, local link
targets, scaffold-token removal and whitespace. `just diagrams-check` detects
source/HTML/SVG drift. Neither proves semantic accuracy, browser behavior or
release readiness; dated evidence records those claims separately.
