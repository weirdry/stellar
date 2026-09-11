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
through repository-owned configuration. This foundation has no application
manifest, deployed environment, or released input contract. Source is hosted in
the public `weirdry/stellar` GitHub repository.

`dev` is the integration branch and has no deployment target. Promotion to
`main` is the intended release boundary. Development intermediates may evolve
in place. Compatibility work requires concrete released-consumer or durable-state
evidence. This does not permit deleting real input snapshots or user overrides.
