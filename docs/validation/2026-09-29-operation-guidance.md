# Operation-specific instruction loading

Date: 2026-09-29

State: **As-built**

## Scope and ownership

[Issue #48](https://github.com/weirdry/stellar/issues/48) separates first generation,
remembering a completed map, refresh and explicit user correction. The revised
[skill entry](../../SKILL.md) retains runtime/intent and cross-route invariants,
then selects one operation. [Run guidance](../../references/runs.md) owns shared
output preparation, retained artifacts, renderer identity, verification and delivery.
[Continuity](../../references/continuity.md) owns shared state/run boundaries;
[choices](../../references/choices.md) is loaded only for authored decisions.
Collection retention and recovery are separate references, loaded when applicable.
Existing continuity/run anchors remain useful routing points for existing links.
No CLI behavior, schema, bundle, viewer, installation or release changes.

## Actual instructed paths and controlled comparison

At baseline `e76de76589ba914cd265d7f13ff4f8a16f176cef`, SKILL.md unconditionally
instructed reading the work-map contract and classification guidance. Continuity
was required for saved maps, corrections and refresh; run guidance included both
collection detail and renderer-recovery installation commands. First generation
could read only the linked first-classification section of continuity; the
comparison uses that narrower path rather than counting the entire document.
The decision-authoring paths also read the choices contract and the work-map
schema it references. The controlled baseline loads both schema files in full;
remembering an unchanged map does not author choices and excludes those reads.
The remaining instructions selected capture and evidence-reading references
when collecting/classifying. These are instructed paths, not proof that every
historical host followed them or loaded every link.

The author read these sources, implemented the router, then explicitly exercised
the revised routes below. The [comparison script](../../scripts/bench/instruction-reading.ts)
loads the selected exact documents/sections from Git for the baseline and the
working tree for the revised paths, writes their concatenated text into a fresh
local directory, and records per-selection bytes and hashes in a
[receipt](data/2026-09-29-operation-guidance/results.json). It is a controlled
instruction-content replay, not a host interceptor or an independent agent trial.

Run from this checkout:

```sh
just instruction-reading-comparison NEW_UNUSED_DIRECTORY
```

The fixed baseline must exist locally; the command does not fetch it. Inspect
its `*-before.md` and `*-after.md` files alongside the receipt to audit the loads.
Each independent scenario counts a document/section once; shared content is not
charged repeatedly inside one route. The fixed scenarios use supplied native
captures, valid existing artifacts, and revised choices covered by the inline
format, including the domain definitions needed by a normalized first draft.
Provider guides, recovery and direct canonical-map authoring are conditional
branches excluded on both sides. Source JSON, choices data, CLI output, system
instructions and host framing are not included in instruction bytes. The example
choices remain illustrative data, not semantic classification proof.

| Scenario                              | Before bytes | After bytes | Reduction | Selected reads before / after |
| ------------------------------------- | -----------: | ----------: | --------: | ----------------------------: |
| First report from supplied capture    |       79,918 |      52,076 |     34.8% |                         9 / 9 |
| Remember completed map                |       67,631 |      19,238 |     71.6% |                         5 / 4 |
| Refresh with supplied capture         |       99,318 |      63,674 |     35.9% |                        9 / 10 |
| Explicit correction to existing group |       80,987 |      21,503 |     73.4% |                         7 / 5 |

The revised refresh path loads more, smaller documents; first generation has the
same selected file count. Splitting guidance can increase file-read/tool overhead
even while selected content shrinks; no call-count,
latency, billing, cached-input or model-token benefit is established. Refresh
conservatively includes the general reader, even though the focused reader may
suffice. Remember and simple correction no longer load unrelated collection,
first-classification, refresh-reader or recovery procedures. New taxonomy design
adds classification/reading guidance; a direct authored map adds the work-map
contract; failures add relevant recovery sections. Those additional branches
can reduce or erase savings. A host may batch reads or retain already-loaded
references, so neither file count nor repository-wide bytes is actual model input.
The baseline's whole-schema reads are an explicit selection, not a claim that
every host reads the entire referenced schema rather than selected definitions.

### Self-review correction

The original receipt at `5bc731e` omitted domain authoring from the inline choices
example and omitted the required schema reads from the baseline decision paths.
A normalized native capture has no domains or categories, so the original
first-generation scenario could not stay within the claimed inline contract.
The corrected example includes domain definitions and tells existing-state
operations to omit unchanged taxonomy. The receipt now counts the baseline's
choices contract and referenced work-map schema, while the revised paths cover
the exercised fields inline. These larger baseline totals correct the reading
inventory; the changed percentages do not represent additional runtime savings.
The revised choices guide itself grew by 382 bytes.

A focused synthetic replay extracted the JSON fence from the old and corrected
choices guides, substituting the normalized issue ID and an evidence-grounded
rationale for one invented reusable-tooling issue. The old example fails with
`Category domain is undeclared` and creates no output run. The corrected example
completes `classify-draft`; its map/state/HTML pass `validate`, `render` and
`verify-run`. Separate remember, explicit user correction without taxonomy
upserts, and refresh stages also pass those checks and preserve the user
classification and intentionally empty targets. All 20 delivered-CLI invocations
return their expected exit codes. This is a manual behavior probe, not a
wording test or an independent model trial; it supplements the earlier workflow
below without changing its recorded 47-call result.

## Preservation review

Author review followed each requirement to its owning route/reference:

| Requirement                                                                                             | Retained owner and trigger                                                                                      |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Person, account, scope and locale selection; untrusted source text                                      | SKILL.md on every route; provider guide only for selected live sources                                          |
| Mechanical retention, native wrapper handling, timestamps, partial coverage and obtained context bodies | Collection/capture on first generation and refresh; existing evidence reused on remember/revise                 |
| Native identity, explicit relations and unknown endpoints                                               | SKILL.md, capture; refresh retains detailed saved-identity matching and uncertainty rules                       |
| Purpose, deliverables, exclusions and membership review                                                 | Classification/reading for agent decisions and new group design; explicit user membership remains authoritative |
| Saved lineage, absent decisions, independent targets and user origin                                    | Continuity, choices and relevant operation; no restart from map when state exists                               |
| Fresh private runs, validation, source/state/HTML consistency and truthful delivery                     | Runs on all artifact-producing routes                                                                           |
| Missing capture/renderer, failed runs and unsupported local references                                  | Conditional links from the entry, runs, continuity and remember into recovery                                   |

The schema remains available for direct-map authoring and diagnostic repair;
normalization/runner validation still enforce its invariants. Moving it out of
unconditional reading does not permit dropping source facts or bypassing checks.

## Explicit synthetic workflow

The revised routes were invoked using the existing delivered runner through
`just --command mise exec --locked -- node ABSOLUTE_STELLAR_ROOT/bin/stellar.mjs`.
The source revision was `e76de76` with only this operation-guidance/documentation
and comparison-tool change. Inputs were the invented `examples/mixed-capture.json`
and `examples/mixed-choices.json`; no live collection or private source was used.
All generated runs occupied fresh ignored local directories. Forty-seven CLI
invocations completed with the expected exit codes, including deliberate failures.

1. **First:** mechanically retain capture/choices, normalize, read each assigned
   short body, then `classify-draft`. Validate, render, retain matching evidence
   and verify the resulting map/state/HTML.
2. **Remember:** take the complete first map as a separate standalone-map scenario
   with no state supplied; validate and `remember` it in a fresh directory. The
   emitted map equals the input. This is not used to restart the continuing lineage.
3. **Revise:** on the original first state, apply an explicit synthetic request
   pinning OBS-1 to transit research and setting user-owned targets to `[]`.
   Unrequested issues and all source facts/relations remain unchanged.
4. **Refresh:** append an update to OBS-1 and a progress note to OBS-2 in an authored
   synthetic fresh capture. Read index/full evidence against the original previous
   state, then `refresh`. One agent review and one preserved-user attention entry
   appear. Apply only the agent decision with `classify`; no pending review remains.
   The explicit user category/rationale and empty user-owned target list survive.

Each final route ran `validate`, `render` and `verify-run` with the actual state;
all four checks passed. The three registered relations survived, input capture
copies stayed literal, and source timestamps/partial relation coverage stayed
visible. Renderer versions/file hashes and local README disclosures accompany
the outputs. Authored choices fit the invented calibration/control/delivery
purposes; this is author semantic inspection, not autonomous classification QA.

Recovery exercises rejected an occupied destination without changing its state,
rejected malformed JSON without producing a usable run, then succeeded at a
fresh repaired destination. A missing-capture scenario validated/rendered and
explicitly disclosed that capture comparison/full verification was unavailable.
A report-relative attachment caused continuity refusal; the original link/map
were retained, without upload or deletion. Historical-renderer recovery was read
and link-checked but no old installation was downloaded or substituted.

Skill-entry validation passed. Repository Markdown links and the existing checks
are recorded against the final PR head. A local HTML browser inspection was
attempted but the host rejected `file:` navigation under its URL security policy.
No alternate browser surface or serving workaround was used; browser interaction
and visual review are unperformed for these generated artifacts. Viewer/input
contracts are unchanged. Automatic discovery, installation, publication, live
source access and cross-host instruction behavior remain unverified.
