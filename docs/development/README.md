# Development

The product is a Node-native JavaScript CLI with an HTML/CSS/JavaScript/SVG
viewer. `package.json` and `pnpm-lock.yaml` own one dependency graph.
Contributor product commands execute JavaScript source; `just build-runner`
uses esbuild to generate the installed runner. No TypeScript compilation step,
published library, or backend exists.
Node's built-in test runner covers the small native CLI; Playwright drives
separately named browser verification.

## Initialization

Follow [the root setup instructions](../../README.md). `just init` installs
exact tools through the committed mise lock, installs dependencies with frozen
pnpm resolution, and enables `.githooks`. It verifies that selectors and locks
were not rewritten. Corepack from the pinned Node selects `packageManager`;
pnpm does not select or install Node. Browser installation is separate.

Project commands exclude global mise tool configuration and user npm config.
These public dependencies require no credentials or sibling checkout. Tool
locks cover macOS arm64 and Linux x64. Bash, Git, and Perl are prerequisites.
The pnpm configuration applies a one-day minimum release age and allows no
dependency build scripts.

## Commands

Canonical authoring follows the [documentation policy](documentation.md).
Use `just diagrams-build` with a reviewed `ARCHIFY_ROOT` for explicit generation;
`just diagrams-check` is read-only and included in CI. The
[diagram guide](../architecture/diagrams/README.md) describes source validation,
SVG export, browser review and evidence retention.

| Command                                     | Behavior                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `just init`                                 | Locked tools, frozen dependencies, local hooks                                                                               |
| `just format`                               | Explicit Prettier write                                                                                                      |
| `just format-check`                         | Read-only repository-local Prettier check                                                                                    |
| `just docs-check`                           | Canonical structure, indexes, local links, whitespace                                                                        |
| `just diagrams-build`                       | Explicit Archify generation and SVG export using the reviewed generator                                                      |
| `just diagrams-check`                       | Read-only source/HTML/SVG inventory, generator identity, hash and export comparison                                          |
| `just lint`                                 | ESLint, Just format, Bash syntax, ShellCheck, actionlint, Git whitespace                                                     |
| `just test`                                 | Deterministic Node unit and CLI integration tests                                                                            |
| `just build-runner`                         | Explicitly regenerate the installed runner, integrity manifest and dependency notices                                        |
| `just bundle-check`                         | Read-only runtime resource inventory and byte comparison of the generated runner, integrity manifest and notices             |
| `just version`                              | Print the product version from its authoritative source                                                                      |
| `just doctor [--json]`                      | Read-only runtime and installed-build consistency diagnostics                                                                |
| `just help [COMMAND]`                       | Global or command-specific CLI usage                                                                                         |
| `just check` / `just ci`                    | Documentation structure, diagram consistency, format, lint, bundle currency and Node tests; no installation or repair writes |
| `just browser-install`                      | Explicit Chromium download using pinned Playwright                                                                           |
| `just browser-check`                        | Chromium interaction, reuse, safety, viewport and export tests with synthetic inputs                                         |
| `just normalize INPUT OUTPUT`               | Convert native capture to an unclassified work-map draft                                                                     |
| `just classify-draft DRAFT CHOICES RUN`     | Apply initial agent decisions and save a complete map/state in a fresh directory                                             |
| `just retain-response INPUT NEW_FILE`       | Preserve a host response file without echoing its contents or replacing another file                                         |
| `just inspect MAP [ISSUE [OFFSET]]`         | Page through issue metadata or a template-independent body index                                                             |
| `just read-issue MAP ISSUE BLOCK [OFFSET]`  | Read exact bounded source excerpts                                                                                           |
| `just search-issue MAP ISSUE TEXT [OFFSET]` | Locate literal source text, returning bounded match pages                                                                    |
| `just remember MAP RUN`                     | Initialize private state from a complete map in a new directory                                                              |
| `just refresh STATE CAPTURE RUN`            | Normalize current facts and reapply saved choices                                                                            |
| `just classify STATE CHOICES RUN`           | Apply agent choices while protecting user decisions                                                                          |
| `just revise STATE CHOICES RUN`             | Record explicit user corrections                                                                                             |
| `just skill-link`                           | Register this checkout as a local user skill; refuse conflicting installs                                                    |
| `just validate INPUT`                       | Validate input without writing it                                                                                            |
| `just render INPUT OUTPUT`                  | Validate and generate a standalone HTML artifact                                                                             |
| `just verify-run CAPTURE MAP HTML [STATE]`  | Read-only source-fact, HTML, bundle and optional state-map comparison                                                        |

Tests create temporary artifacts and remove them. Gates do not rewrite source,
format files, collect data, commit, or publish. No empty build or typecheck
recipe is provided for plain JavaScript. Report generation is an explicit product
operation. `just build-runner` separately regenerates the committed installed
runner, integrity manifest and dependency notices; `just bundle-check` compares them without writing
and is included in `check` and `ci`. See [distribution](distribution.md).

`just render` writes generated HTML with owner-only permissions (`0600` on POSIX),
including replacement outputs. This protects reports that embed private input.
If sharing or serving an artifact, review its data and deliberately choose the
necessary access permissions; the renderer does not publish it or grant access
to other users.

For optional visual evidence:

```sh
STELLAR_QA_DIR=outputs/qa just browser-check
```

Screenshots in this mode contain only the suite's synthetic fixtures. The
`STELLAR_CHROME` environment variable can select an installed Chromium executable
for constrained local environments; default checks use Playwright's pinned
browser. The browser gate fails if Chromium is unavailable; it does not skip.
Private regression inputs and scripts must remain in ignored local locations.

## Optional CLI performance measurements

`just benchmark OUTPUT [REFERENCE_RESULTS [SIZES [TRIALS]]]` measures the real
bundled CLI on generated synthetic data and compares complete output hashes.
The [performance guide](performance.md) owns prerequisites, workload, reproduction
and interpretation. Python 3.11+ is optional contributor tooling for this command
only; it is not installed by `just init` or required by the product or CI.
Timing samples and peak RSS are dated observations, not pass/fail timing gates.
Use `just benchmark-test` for the optional harness's reference-validation and
small synthetic comparison regressions, separately from `just ci`.

## Work tracking and agent instructions

Use the [issue workflow](../../CONTRIBUTING.md#issue-management),
[work template](../../.github/ISSUE_TEMPLATE/work.md), and repository-linked
[Project](https://github.com/users/weirdry/projects/2) for scoped development work.
Keep issue bodies, assignees, and Project status current. Related PRs targeting
`dev` use `Refs #123`; close an issue explicitly only when its stated acceptance
criteria are met. `main` promotion, skill installation, and live acceptance are
separate outcomes when relevant.

[Shared rules](../../RULES.md) own repository-wide agent instructions;
[AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md) only reference them.
Check entry files and relative links after edits, then verify loading in a fresh
agent session before claiming runtime discovery. `SKILL.md` owns the product
workflow. Adding the issue template on `dev` does not make it appear in GitHub's
web chooser before the normal promotion to default-branch `main`.

## Changes and delivery

Runtime selectors belong in `mise.toml`, with a real lock regenerated using
`mise lock --platform macos-arm64,linux-x64`. Direct package versions are exact;
change `package.json` and regenerate the pnpm lock deliberately. `just init`
and hosted CI use frozen resolution. Repository Prettier and flat ESLint config
are shared by local checks and CI.

The pre-commit hook runs `just ci`; the commit-message hook enforces Conventional
Commits. The hosted workflow invokes the same gate, explicitly installs browser
system dependencies, and runs `just browser-check`. It never loads `local/`.
Local success, hosted results, visual review, review/merge, and publication are
separate evidence. Workflow configuration alone does not prove a successful run.
