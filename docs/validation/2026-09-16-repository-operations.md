# Repository work tracking and agent rules

Date: 2026-09-16

State: **As-built**

## Scope and reference

Stellar adopted the issue workflow and agent-entry structure from
[`weirdry/crew` at `97f2a76`](https://github.com/weirdry/crew/tree/97f2a76c3018b80f80886cab6590deca510847c5).
Repository-wide instructions now live in [RULES.md](../../RULES.md), referenced
by one-line [AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md) files.
Contribution procedures, issue format and technical facts retain their own
document owners. Product code, skill workflow and input contracts are unchanged.

## Hosted configuration

GitHub API read-back confirmed the following settings for the private
[Stellar Project](https://github.com/users/weirdry/projects/2):

- Linked repository: `weirdry/stellar`.
- `Status`: Backlog, Todo, In Progress, In Review, Done.
- `Priority`: Urgent, High, Normal, Low.
- `All work`: table view; `Workflow`: board view with Status columns.
- [Operations adoption](https://github.com/weirdry/stellar/issues/7) and the
  [pending live pilot](https://github.com/weirdry/stellar/issues/8) are assigned
  to the maintainer and registered as Project items with Normal priority.

Issue and Project status remain operational records rather than values copied
into this document. No automatic status synchronization was added. Public issue
content remains public despite private Project visibility.

## Validation and limits

- A whitespace-normalized comparison against the prior `AGENTS.md` verified
  that every existing rule bullet remains in `RULES.md`.
- Static checks verified both one-line entry documents, the five-section issue
  template, and both hosted issue bodies and assignees. Project field values,
  visibility, repository link and view layouts were read back from GitHub.
- Local `just ci` passed documentation, formatting, lint, repository checks,
  and all 62 Node tests. No new product tests were needed for this documentation
  and hosted-configuration change. Hosted CI is reported separately on the PR.
- Fresh Codex and Claude Code sessions have not been exercised for automatic
  instruction loading. Static checks do not prove runtime loading. No skill
  installation, live collection, pilot run or private artifact modification was
  performed.
- The new issue template is available in this checkout. GitHub's web chooser
  uses default-branch `main`, so it becomes available there after normal
  promotion. This change does not promote or release the repository.
