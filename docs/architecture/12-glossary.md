# 12. Glossary

State: **As-built**

## Work and interpretation

| Term                    | Meaning                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Work map                | Representation of a person's current work through purpose classification, source relationships and contextual details.                                                   |
| Domain                  | Top-level purpose area containing categories; its order also determines the viewer palette order.                                                                        |
| Category                | Outcome-oriented subgroup within one domain, with a stated basis for membership. Source project labels do not prescribe it.                                              |
| Primary classification  | One category and rationale for each assigned issue, with agent or user origin. A category supplies its domain; the issue does not repeat the path.                       |
| Target tag              | Overlapping interpretation that can span categories. It creates no dependency and is distinct from the architecture state **Target**.                                    |
| Assigned issue          | Issue inside the requested counting scope. It needs a primary classification before the map can render.                                                                  |
| Context issue           | Issue outside the requested counting scope, included for context such as a registered relationship. It never contributes to assigned totals and may remain unclassified. |
| Filtered assigned issue | Assigned issue excluded only by the current status filter; still searchable and available as a neighbor. It has not become source context.                               |
| Registered relation     | A source-recorded parent, blocker, related or duplicate relationship. The contract defines direction and valid endpoints.                                                |
| Inferred association    | An interpretation supported by reasoning, not a registered source dependency. The current relation contract does not accept arbitrary inferred edges.                    |

## Evidence and continuity

| Term                           | Meaning                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source namespace               | The provider's workspace/repository boundary, used to distinguish repeated identifiers across sources.                                                                                              |
| Native identity                | The source-native issue identity. Continuity matches provider, namespace and native ID; a display identifier or report-local key alone is insufficient.                                             |
| Graph key                      | Internal issue `id` used by the current map's relations and choices. It is distinct from the visible identifier.                                                                                    |
| Coverage                       | Host declaration of complete, partial or unavailable lookups within a stated query scope. It does not prove global source completeness.                                                             |
| Full detail / unqueried detail | Whether source detail was obtained for an issue. Full detail does not mean every optional field or relation was fetched; unqueried detail requires unknown status.                                  |
| Field ownership                | Classification and targets have independent agent/user ownership. Refresh preserves both; agent updates cannot replace user-owned values.                                                           |
| Review reason                  | Saved reason an interpretation needs explicit classification, such as new work, changed purpose text or uncertain identity. Target-only edits and temporary absence do not clear it.                |
| Not observed                   | A remembered source identity absent from the current normalized capture. Its memory is retained; absence does not mean deletion, completion or even removal from the broader source.                |
| Previous-observation notice    | Runner-owned `classificationEvidence` notice that retained classification on unqueried context uses earlier full-text evidence. It changes neither current status/detail nor classification origin. |
| State lineage                  | The chain selected by passing one saved state into the next operation. Choosing an older state starts from those older decisions; branches are not automatically reconciled.                        |

## Files and implementation

| Term                   | Meaning                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Capture                | Host-retained native records with source scope, freshness and coverage; input to normalization and refresh.                                                                                 |
| Draft                  | Normalized current facts in the work-map shape, with assigned classification still pending. It supports evidence reading and first-run choice application.                                  |
| Choices                | Authored taxonomy/classification/target edits supplied to a command. They contain no authority to alter source facts or declare their own actor origin.                                     |
| Work-map specification | Current report JSON governed by the work-map schema. After complete validation, it is renderer input and the data embedded in HTML.                                                         |
| Saved state            | Private continuity artifact containing the current map, remembered decisions/evidence and current change summary. It continues a run and can exist before its map is renderable.            |
| Run                    | Fresh output directory created by a continuity command. The runner writes state, map and change summary; the host separately adds capture/evidence, HTML and handoff details as applicable. |
| Change summary         | Comparison with the selected previous observation, plus current review needs. The initial summary is empty; it is not an event log.                                                         |
| Bundled viewer         | Fixed visual and interaction implementation embedded in every generated report. Browser navigation is not a saved classification edit.                                                      |
| Renderer               | Code that validates the map and combines it with bundled resources into standalone HTML.                                                                                                    |
| Canonical              | Authority for a concern, not proof that a claim is implemented or immutable.                                                                                                                |

The [artifact ownership view](05-building-block-view.md#artifact-ownership-and-continuation)
connects these files. Exact fields belong to the [contract guide](../../schemas/README.md)
and schemas; operations belong to the [continuity guide](../../references/continuity.md).
Architecture and ADR state vocabularies are defined in the
[documentation index](../README.md).
