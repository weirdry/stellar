# 2. Constraints

State: **Target**

- Keep the agent's interpretation separate from deterministic UI implementation.
- Preserve the prototype's tree, graph, and inspector interaction model during
  the first import, then verify a second dataset without viewer edits.
- Source project names and labels must not dictate the classification hierarchy.
- Bundle viewer resources with the skill; ordinary generation must not depend
  on the author's machine, a sibling checkout, or a live Archify installation.
- User snapshots and reports are local data, not public package fixtures.

## Repository and release constraints

State: **As-built**

Stellar adopts the linked [organization standards](../development/standards.md)
through repository-owned configuration. The Node-native application
manifest and locks are implemented; no deployed environment or released input
contract exists. Source is hosted in
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
`main` is the intended release boundary. Development intermediates may evolve
in place. Compatibility work requires concrete released-consumer or durable-state
evidence. This does not permit deleting real input snapshots or user overrides.
