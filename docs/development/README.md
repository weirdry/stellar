# Development

The product is a Node-native JavaScript CLI with an HTML/CSS/JavaScript/SVG
viewer. `package.json` and `pnpm-lock.yaml` own one dependency graph. No
TypeScript artifact, compiler build, published library, or backend exists.
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

| Command                       | Behavior                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `just init`                   | Locked tools, frozen dependencies, local hooks                                             |
| `just format`                 | Explicit Prettier write                                                                    |
| `just format-check`           | Read-only repository-local Prettier check                                                  |
| `just docs-check`             | Canonical structure, indexes, local links, whitespace                                      |
| `just lint`                   | ESLint, Just format, Bash syntax, ShellCheck, actionlint, Git whitespace                   |
| `just test`                   | Deterministic Node unit and CLI integration tests                                          |
| `just check` / `just ci`      | Complete local gate above, without dependency installation or persistent generated outputs |
| `just browser-install`        | Explicit Chromium download using pinned Playwright                                         |
| `just browser-check`          | Chromium interaction, reuse, safety, viewport and export tests with synthetic inputs       |
| `just normalize INPUT OUTPUT` | Convert native capture to an unclassified work-map draft                                   |
| `just skill-link`             | Register this checkout as a local user skill; refuse conflicting installs                  |
| `just validate INPUT`         | Validate input without writing it                                                          |
| `just render INPUT OUTPUT`    | Validate and generate a standalone HTML artifact                                           |

Tests create temporary artifacts and remove them. Gates do not rewrite source,
format files, collect data, commit, or publish. No empty build or typecheck
recipe is provided for plain JavaScript. Generation is an explicit product
operation, not a compiler build or package release.

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
