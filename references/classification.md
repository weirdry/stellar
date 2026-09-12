# Classify by work purpose

The tree answers “what outcome am I working toward?”; source relations answer
“what depends on or belongs under what?” Keep those answers separate.

Read the requested set together before naming categories. Use two levels:
`domain` for an area of work and `category` for a concrete outcome, research line,
operational responsibility, or tool capability. Every assigned issue has one
primary category and a rationale grounded in its title/body. Targets can express
secondary concerns across categories without moving or duplicating issues.

## Choose useful granularity

Split a broad bucket when its issues have different objectives, deliverables, or
completion criteria that the user would navigate separately. Combine scattered
issues when they contribute to the same purpose, even across repositories,
providers, teams, projects, or tags. A small category is legitimate if its outcome
is distinct. Avoid one category per issue merely to make every label precise.

For an invented observatory dataset:

| Observed work                                                          | Primary purpose            | Why                                                                  |
| ---------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| Calibrate the transit detector; compare transit false positives        | Transit detection research | One research question and evaluation output                          |
| Compare spectral features; evaluate spectral drift                     | Spectral feature research  | Different experimental objective from transit detection              |
| Speed up reusable simulation runs                                      | Research tooling           | Shared experimental capability, not a particular research result     |
| Repair telescope control retry behavior                                | Telescope operations       | Runtime control reliability, not offline research                    |
| Rotate deployment credentials; repair CI cache across two repositories | Delivery operations        | Shared operational responsibility despite scattered project metadata |

“Observatory R&D” alone would conceal these distinctions. Conversely, “GitHub
work” and “Linear work” describe storage location rather than purpose.
Do not reuse these names for unrelated datasets. An issue mentioning a system as
a consumer does not necessarily belong to that system's primary category.

## Make decisions inspectable

A good rationale is specific: “Builds a reusable simulation runner used by both
research tracks.” A weak rationale is circular: “This is tooling.” Category
`basis` describes the inclusion rule; domain `description` explains the broader
area. Source issue titles and descriptions remain literal source facts.

If the evidence is insufficient, keep an explicit category such as “Purpose to
clarify” with a factual rationale explaining what is missing. Do not invent an
objective to avoid uncertainty. Unqueried context can stay unclassified and never
inflates assigned counts.

Use `origin: user` only for an explicit user categorization; retain that choice
when authoring this report. Other choices use `agent`. The
[continuity workflow](continuity.md) persists choices and applies them during
requested refreshes. Shared categories/targets,
similar wording, and URL mentions alone never establish dependency edges.
