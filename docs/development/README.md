# Development

The product has a strict TypeScript core/CLI running on Node and an
HTML/CSS/JavaScript/SVG viewer. `package.json` and `pnpm-lock.yaml` own one
dependency graph. Contributor commands execute erasable TS directly; the separate
no-emit compiler checks it. `just build-runner` generates the installed JavaScript
runner with esbuild. There is no published library or backend.

The [TypeScript guide](typescript-adoption.md) defines the implemented core/CLI
and type-tooling boundary, schema-derived declarations and runtime narrowing.
The viewer, existing behavior tests and unrelated tools retain their current
languages. Node's test runner and separate Playwright checks cover behavior.

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
dependency build scripts. It sets `verifyDepsBeforeRun: error`, so checks report
stale dependencies instead of installing them. Run `just init` explicitly after
dependency changes. A [locked declaration patch](../../patches/README.md) fixes a
generator dependency's type constraint while keeping strict library checking.

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
| `just lint`                                 | Type-aware TS/JS ESLint, Just format, Bash syntax, ShellCheck, actionlint, Git whitespace                                    |
| `just types-build`                          | Explicitly generate schema declarations with pinned tools                                                                    |
| `just types-check`                          | Read-only schema/declaration inventory and byte comparison                                                                   |
| `just typecheck`                            | Strict no-emit checking, type fixtures and complete owned-file inventory                                                     |
| `just test`                                 | Deterministic Node unit and CLI integration tests                                                                            |
| `just build-runner`                         | Explicitly regenerate the installed runner, integrity manifest and dependency notices                                        |
| `just bundle-check`                         | Read-only runtime resource inventory and byte comparison of the generated runner, integrity manifest and notices             |
| `just version`                              | Print the product version from its authoritative source                                                                      |
| `just doctor [--json]`                      | Read-only runtime and installed-build consistency diagnostics                                                                |
| `just help [COMMAND]`                       | Global or command-specific CLI usage                                                                                         |
| `just check` / `just ci`                    | Documentation, diagrams, format, declarations, types, lint, bundle currency and Node tests; no installation or repair writes |
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
format files, collect data, commit, or publish. Generated declarations are excluded
from Prettier because their generator owns those bytes; currency and compiler
checks still cover them. Report generation is an explicit product operation. `just build-runner` separately regenerates the committed installed
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
Use `just profile BENCHMARK_DIRECTORY OUTPUT [TRIALS]` for separate CPU and
allocation sampling of its retained synthetic artifacts, and `just profile-test`
for deterministic attribution checks. Profiled timings include instrumentation
overhead; the performance guide owns interpretation and output-retention limits.

The optional [native-worker experiment](../../scripts/bench/native/README.md) adds
`just native-build` and `just native-compare` for a synthetic Node/Go/Rust
comparison from its documented pre-conversion archival checkout. It requires explicit native compilers and includes the cost of
retained Node validation and JSON transfer; it does not change the skill runtime.

The separate [standalone archive](../../scripts/bench/standalone/README.md) retains
the full-command prototypes and evidence. `just standalone-check` checks the
historical data without executing native code; `just standalone-replay` rebuilds
and checks it in a fresh directory on macOS from the documented archive checkout
with its own frozen dependencies, not the current TS dependency graph. These optional commands do not add
Go/Rust to the product or default CI, and do not approve a native migration.

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
