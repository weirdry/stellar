# 11. Risks and technical debt

State: **Open**

## Ongoing risks

These are conditions to watch in actual runs, not known incidents or numerical
risk ratings. A host agent owns the immediate response in its run; a Stellar
maintainer owns changes to shared guidance, contracts and implementation.

| Trigger and user impact                                                                                                                                                                               | Current mitigation                                                                                                                                                                         | Evidence to resolve or reconsider                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Host capability drift:** changed permissions, tool shape, pagination or relation support can omit work or make completeness claims misleading.                                                      | The collecting agent verifies current capabilities, records coverage per lookup, retains available evidence and discloses gaps. The viewer exposes scope and freshness.                    | Resolve the run-specific uncertainty with observed query/lookup evidence. Update a provider guide when a reproducible capability change is established; one successful host does not cover all hosts. See [collection](06-runtime-view.md#source-collection).                                                  |
| **Retention and selective-reading gaps:** a host may lack file transfer, or a preview may omit a decisive exclusion or deliverable, leading to incomplete reasoning.                                  | The agent establishes a mechanical transfer path where available, retains complete available bodies, marks truncation and expands exact reading when evidence is insufficient.             | Demonstrate the actual retention path and inspect relevant full evidence for the run. Claim savings only after comparable measurement; repeated missed evidence can justify changing reading guidance. See [reading](../../references/reading.md).                                                             |
| **Classification misfit or identity uncertainty:** source text can change meaning, a plausible category can hide different outcomes, or a display identifier can acquire a different native identity. | The agent reviews purpose and exclusions. Refresh protects user-owned fields, withholds changed agent classifications and preserves unresolved/absent memory without rebinding identities. | Explicit evidence-based classification can resolve a current review; it does not prove historical identity correspondence. Reconsider identity handling only with a concrete affected consumer/state and an approved design. See [continuity](../../references/continuity.md).                                 |
| **Visual overload:** dense graphs, long names or different font metrics can hide labels or obstruct source paths, making navigation harder.                                                           | Fixed rules preserve identity, allow label suppression, bound fitting and offer tree/search/inspector/pan/zoom access. Browser fixtures and image review exercise known cases.             | Capture a reproducible affected layout, review a synthetic equivalent, and check both readability and unchanged semantics before changing algorithms. No current rule promises obstacle-free arbitrary graphs. See [viewer](../../assets/viewer/README.md).                                                    |
| **Delivery controls or dependency findings:** hosting configuration drift or an actionable advisory may weaken the intended integration/release checks.                                               | Repository-owned checks, contribution rules and reproducible runner checks define local obligations. These files alone do not prove remote enforcement or absence of vulnerabilities.      | The maintainer verifies applicable hosting settings and evaluates actual dependency findings at the relevant delivery boundary. No live hosting or advisory audit is claimed by this documentation update. See [contribution rules](../../CONTRIBUTING.md) and [distribution](../development/distribution.md). |

The [runtime response table](06-runtime-view.md#failure-response) describes what
the host can continue, what it must disclose and which artifacts to preserve
when these conditions occur. Do not turn a run-specific gap into a new migration,
capacity program or deployment gate without evidence.

## Known implementation limits

State: **As-built**

| Limit                                                                     | Current user consequence and available path                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two-level domain/category taxonomy and direct one-hop issue neighborhoods | Deeper source structure is not a deeper classification tree. Use the existing tree, direct neighbors and source links; targets express overlap without adding dependencies.                                                                                  |
| Korean and English fixed UI only                                          | Select a supported locale. Source text remains literal; a host cannot introduce another fixed UI language by translating arbitrary interface markup.                                                                                                         |
| One selected local state lineage                                          | Refresh, classification and revision are explicit operations producing fresh runs. Choosing an older state branches the decisions; there is no concurrent merge, background sync or browser editing persistence. Retain the intended state for continuation. |
| No automatic identity rebinding                                           | A new native identity matching an old display identifier remains distinct until a future approved mechanism exists. Review the current entry and preserve historical memory; do not infer deletion from absence.                                             |
| Exact renderer-dependent HTML verification                                | A newer runner can reject older HTML bytes. Retain the recorded renderer identity and original artifacts; use isolated historical-runner recovery when available.                                                                                            |
| Local files rather than an access-controlled service                      | Generated HTML and SVG can disclose report data if shared. State can include absent decisions; it remains private and separate from the browser artifact.                                                                                                    |

The retained SVG viewer is an implementation choice, not an outstanding framework
migration. No independent consumer requires the original prototype's intermediate
JSON shapes. The published version 1 contracts and actual durable user files are
separate compatibility evidence and must be assessed before changing them.

## Undecided extensions

State: **Open**

| Possible extension                                        | Reconsider only when                                                                                                | Decision still needed                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additional UI languages                                   | A real user requests an unsupported language and reviewed copy can be supplied.                                     | Which locale and naming/date rules to support, with catalog and browser evidence. No language beyond Korean/English is committed.                              |
| Automatic refresh, shared editing or reconciliation       | A concrete workflow needs unattended freshness or multiple writers beyond explicit local runs.                      | Source-access ownership, user-choice authority and the actual durable-state boundary. There is no accepted backend or shared runtime design.                   |
| Identity rebinding or a more general graph/taxonomy model | Observed source identity transitions or user navigation needs cannot be represented adequately by current behavior. | Evidence for correspondence/semantics, affected stored data and the smallest change that protects existing decisions. A hypothetical consumer is insufficient. |

## Resolved distribution milestone

State: **As-built**

The first public release is no longer an open item. The
[v0.1.0 record](../validation/2026-09-19-v0.1.0-release.md) records publication and
installation acceptance. This does not establish host discovery for every agent
or release the current development checkout. There is no development deployment.
