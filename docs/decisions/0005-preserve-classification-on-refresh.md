# ADR-0005: Preserve classification through local saved state

Status: **Accepted**

Date: 2026-09-13

## Context

A repeatable viewer does not preserve interpretation across newly collected
snapshots. Users need an explicit grouping correction to survive the next run,
including temporary absence caused by query scope or incomplete coverage.
Source facts must still come from the current capture, not remembered work.

## Decision

Keep a private saved-state artifact alongside the current canonical work map.
The state remembers taxonomy, issue classifications, target choices and the last
full title/body used to judge an agent classification. Match only the provider,
namespace and native issue identity. Report-local IDs and display labels do not
establish continuity across runs.

`remember` bootstraps from a valid completed map. `refresh` normalizes a new
capture and reapplies remembered interpretation. `classify` applies agent choices
and `revise` records explicit user corrections. User ownership is tracked for
classification and targets independently; automatic decisions cannot replace
user-owned fields. Agent choices may add groups but cannot redefine existing
ones. Explicit user revisions may upsert group definitions without changing IDs.

Changed full title/body withholds an agent classification until reconsidered.
Status changes alone do not trigger regrouping. The old choice remains available
as context, while missing current assigned classifications block rendering.
Absent identities remain in state; neither partial nor complete query results
prove deletion or completion. Only newly normalized facts and relationships are
included in the current map. The viewer receives the map, never the whole state.

Each operation writes a fresh directory containing state, current map and change
summary; existing paths are refused. There is one selected state lineage, no
shared service, concurrent merge protocol, source writeback or background sync.

Boundary classification: unreleased — corrected in place.
The work-map contract stays version 1. State and choices reuse its schema types;
there is no older state wire version, compatibility reader or migration.

## Consequences

The user retains both HTML for exploration and state for the next run. Choosing
an older state intentionally starts from that older set of decisions; separate
branches are not automatically reconciled. Raw JSON authoring can circumvent
these commands, so this is workflow correctness rather than an authentication
boundary. The skill must use the appropriate actor based on the user's request.

State is private and may include decisions outside the current query. A first
bootstrap conservatively derives target ownership from the map's classification
origin because the earlier map did not track it separately. Taxonomy deletion,
identity rebinding, automatic reclassification, disk watching, GUI editing,
licensing and distribution remain outside this implementation.
