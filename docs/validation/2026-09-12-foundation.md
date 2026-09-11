# Foundation validation

- Date: 2026-09-12
- Source identity: initial uncommitted Stellar foundation; no Git commit exists
- Environment: macOS arm64; locked Just, ShellCheck, and actionlint
- Result: Pass within the foundation scope

## Scope

This record covers the local foundation before the first commit and remote
creation. Current hosting state is maintained in the deployment view.

Repository initialization commands, Git hooks, shell/workflow validation,
canonical documentation structure, and local link targets.

The organization reference was verified against live main at
`9411f3ee4adc5cbb7f7a951e4cee1a1602fffc39`. Action references and the exact mise
Linux release asset were also verified. See [source provenance](../development/standards.md).

## Evidence

| Check | Observed result |
| --- | --- |
| `mise lock --platform macos-arm64,linux-x64` | Six platform entries recorded with download checksums |
| `just init`, repeated twice | Passed; three tools already installed, selectors/lock unchanged, hooks enabled |
| `just ci` | Passed documentation, Just formatting, Bash, ShellCheck, actionlint, and whitespace checks |
| Clean temporary repository copy, `just ci` | Passed without source-checkout or sibling-checkout dependencies |
| Documentation negative cases | Rejected a missing chapter, unknown state, unindexed ADR, broken root link, unresolved token, and trailing whitespace |
| Commit-message hook | Accepted two valid subjects; rejected a malformed subject, tracker identifier, and invalid scope |
| Repository configuration | Unborn `dev`, `core.hooksPath=.githooks`, no remote and no commits |

The clean-copy and negative checks used disposable temporary directories. The
source repository was not committed or modified by those checks. Negative cases
changed one field or file at a time and required a nonzero checker exit before
restoring the fixture. The commit-message check used temporary message files;
it did not create real commits.

The final complete gate was rerun after this record was updated. No product
test or browser suite is hidden behind the foundation result.

## Limits

No remote, hosted CI, product build, browser test, Linear collection, skill
installation, release, or deployment was executed. The prototype source and
user backups remain outside this change.
