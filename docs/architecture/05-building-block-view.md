# 5. Building-block view

State: **Target**

| Building block | Owns | Planned repository home |
| --- | --- | --- |
| Skill instructions | Collection/authoring sequence, decision criteria, repair procedure | Root SKILL.md, added with executable capability |
| Classification guidance | Purpose-based grouping and inference boundaries | [references/classification.md](../../references/classification.md) |
| Work-map contract | Input structure and referential rules | [schemas](../../schemas/README.md) |
| Renderer and validator | Input checking and deterministic artifact generation | Repository-owned scripts, added with the viewer |
| Viewer | Visual tokens, node shapes, layout, navigation, details, export | [assets/viewer](../../assets/viewer/README.md) |
| Examples | Synthetic reusable inputs | [examples](../../examples/README.md) |

## Implemented foundation

State: **As-built**

[justfile](../../justfile) composes the development gate. Initialization and
syntax checking live in `scripts/`; the arc42 checker lives in
`scripts/docs/`. `.githooks/` supplies local commit checks and
[CI](../../.github/workflows/ci.yml) defines the repository-owned hosted caller.

There are no independently deployed subsystems or separate native dependency
roots. Add architecture depth only when real responsibility or failure
boundaries need independent review.
