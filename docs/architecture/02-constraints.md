# 2. Constraints

State: **As-built**

- Keep the agent's interpretation separate from deterministic UI implementation.
- Keep tree, graph and inspector behavior in the bundled viewer. New datasets
  supply data; they do not receive an independently generated UI.
- Source project names and labels must not dictate the classification hierarchy.
- Bundle viewer resources with the skill; ordinary generation must not depend
  on the author's machine, a sibling checkout, or a live Archify installation.
- User snapshots and reports are local data, not public package fixtures.

## Repository and release constraints

State: **As-built**

Stellar follows its own [engineering standards](../development/standards.md)
and [documentation policy](../development/documentation.md). The Node-native application
manifest and locks are implemented; there is no deployed service environment.
The first public skill distribution boundary is `v0.1.0`. Source is hosted in
the public `weirdry/stellar` GitHub repository.

[GitHub Issues](https://github.com/weirdry/stellar/issues) own development scope,
acceptance criteria, ownership and progress; the private
[Stellar Project](https://github.com/users/weirdry/projects/2) provides Status and
Priority views. Private Project visibility does not hide public issue content.
Repository documents and executable evidence continue to own technical facts.
[Shared agent rules](../../RULES.md) are referenced by the one-line
[AGENTS.md](../../AGENTS.md) and [CLAUDE.md](../../CLAUDE.md) entry documents.
Static references alone do not establish loading in a fresh agent session.

`dev` is the integration branch and has no deployment target. Promotion to
`main` is the release boundary. Unreleased development intermediates may evolve
in place; published version 1 contracts and durable user files are real inputs to
compatibility decisions. Any compatibility work must identify the exact artifacts
and consumers it protects. This does not permit deleting real input snapshots or
user overrides.
