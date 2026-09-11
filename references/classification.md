# Classification guidance

State: **Target**

Group issues by their actual purpose and working context. Read descriptions and
relations, not only titles. Existing project membership and labels are evidence,
not a required taxonomy. Split broad groups when distinct research, product,
tooling, or operational work would otherwise be obscured.

Give each in-scope issue one primary classification path and a reason. Additional
cross-cutting targets may overlap. Show out-of-scope context separately from
assigned-issue counts. Preserve explicit user corrections when refreshing data.

Keep source-registered parent, related, duplicate, and blocking relations
distinct from agent-inferred association. Co-membership alone does not imply a
dependency. Record uncertainty instead of inventing a source relationship.

The exact persistent representation and refresh merge rules remain
[Open](../docs/architecture/11-risks-technical-debt.md).

## Authoring language

Select the supported UI locale from the user's explicit output-language request,
or otherwise the conversation language. Record `ko` or `en` in the work map.
Write your classification labels, rationale, and source-scope notes in the
requested language. Preserve original issue titles, status labels and identifiers.
The runner owns the owner-based Stellar name and fixed translated UI. Do not
supply a custom report title or generate translated CSS, HTML, or controls.
