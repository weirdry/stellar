# Development

The current executable surface is repository and documentation tooling, using
Bash and standard platform utilities. There is no Node/Python application
dependency graph yet. Add the applicable native manifest, lock, runtime pin,
and quality commands when importing actual product code.

## Initialization

From the repository root, use the [README setup commands](../../README.md).
The mise configuration pins Just, ShellCheck, and actionlint. The lock covers
macOS arm64 and Linux x64; CI also selects the exact mise executable.

`just init` installs from the committed lock, verifies that selectors and lock
were not rewritten, and sets repository-local `core.hooksPath` to `.githooks`.
It can be repeated. It changes only local development-tool installation and
repository hook configuration. Bash, Git, and Perl are platform prerequisites.
There are no package dependencies or production secrets to install.

Project recipes exclude the user-global mise configuration from tool installation.
Machine-specific overrides remain untracked. The bootstrap and checks require
no sibling checkout, editor, agent runtime, or machine-specific absolute path.

## Commands

| Command | Behavior |
| --- | --- |
| `just` | List commands |
| `just init` | Install locked support tools and enable hooks |
| `just docs-check` | Validate the arc42 corpus, ADR indexing, and local Markdown links |
| `just lint` | Just formatting, Bash syntax, ShellCheck, actionlint, and Git whitespace checks |
| `just check` | Run documentation and tooling validation |
| `just ci` | Run the same complete gate for the current foundation |

There is no product build, test runner, packaging command, or rendering command
yet. Those commands will be added alongside their real capability, without
successful placeholder recipes. In this stage `ci` has no additional artifact
step beyond `check`.

Checks do not install dependencies, reformat source, regenerate documents,
commit, publish, or contact Linear. `just lint` uses the locked tools through
mise; initialize before running it.

## Tool changes

Edit exact selectors and regenerate the lock explicitly:

```sh
mise lock --platform macos-arm64,linux-x64
just init
just ci
```

Review both selector and lock changes. When changing mise itself, align the
workflow's exact `with.version` with the supported configuration floor and
verify the release asset for the CI platform. Action references use immutable
commits. Do not manually invent lock contents or follow moving versions in CI.

## Hooks and CI

The pre-commit hook runs `just ci`; the commit-message hook checks Conventional
Commit syntax and rejects tracker identifiers in the subject. No commit is
created by initialization. Hooks are local feedback, not remote enforcement.

The [CI workflow](../../.github/workflows/ci.yml) installs the locked environment
and calls `just ci` once per job for PRs into `dev` and pushes to `dev` or `main`.
The public GitHub remote is `weirdry/stellar`; `main` is the default branch and
`dev` is the integration branch. PR integration uses rebase merge only.

Inspect [GitHub Actions](https://github.com/weirdry/stellar/actions/workflows/ci.yml)
for actual run results. Branch protection and required-check enforcement are
separate from workflow execution and are not implied by this setup. Dependency
visibility and security-update routing must be evaluated when a native dependency
graph is introduced. Skill distribution and publication remain undefined.
