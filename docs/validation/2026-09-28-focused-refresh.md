# Focused refresh evidence

Date: 2026-09-28

State: **As-built**

## Scope and contract

[Issue #47](https://github.com/weirdry/stellar/issues/47) adds read-only
`read-refresh STATE CAPTURE [ISSUE [VIEW [OFFSET]]]`. It uses the existing refresh
policy on the previous state and fresh capture; it never saves or resolves a
decision. Pending classification and changed user-owned observations are distinct.
The [workflow contract](../../references/continuity.md#read-focused-refresh-evidence)
owns inputs, baseline provenance, full expansion and limits. Published state,
capture and individual-reader contracts remain unchanged; no migration or
release is performed. The development version remains `0.1.4-dev.0`.

The [reader](../../lib/refresh-reading.ts) finds one exact changed interval per
field using common code-point prefix/suffix and 160 code points of context.
Distant changes retain intervening text; no line-diff or semantic-normalization
assumption is made. Full mode makes both available retained observations readable.
Unqueried current detail remains unavailable; saved evidence may predate the
previous map and has no retained acquisition timestamp. Only the previous full
map observation can preserve original null/omitted distinctions that saved memory
may collapse. The view labels that provenance rather than inventing history.

## Regression evidence

[Focused tests](../../test/refresh-reading.test.ts) exercise exact chunks and
full reconstruction, CRLF/Unicode/lone surrogates, both evidence/index pagination,
taxonomy paging, presence distinctions, ambiguous display numbers, identity
uncertainty, unavailable context and previous baselines across repeated refreshes,
absence and reversion. A reverted body can have no focused chunks while its
review remains pending. Source and delivered CLI outputs match from an unrelated
working directory, inputs stay byte-identical and unreadable paths stay private.
The CLI diagnostic matrix includes mixed-help rejection for the new command.

Seven focused tests passed. Type checking and type-aware lint passed. The skill
entry validator passed. Complete local and hosted gate results are recorded
against the final PR head; these do not imply publication or installation.

## Synthetic workflow and semantic review

`just refresh-reading-comparison NEW_DIRECTORY` creates the invented workload,
retained index/taxonomy and per-issue outputs, prior state, capture and authored
choices. The [fixture](../../scripts/bench/refresh-fixture.ts) has eight current
assigned issues and one explicit related-to relation. Unchanged and status-only
work stay out of the six-entry attention index. Five agent reviews and one changed
user-owned observation are included. Inputs come from invented public fixture
construction, not live collection or model-authored copies of private responses.

An explicit invocation ran `just refresh`, `just read-refresh` (index and the
user-owned issue), `just classify`, `just validate`, `just render` and
`just verify-run` in a fresh ignored local directory. The refreshed state had five
pending reviews; authored classification resolved those five. The user category,
rationale and target remained unchanged. Validation and rendering passed, and
`captureFacts`, `embeddedMap`, `bundledViewer` and `stateMap` all passed.

Author semantic review found:

- Appended experiment progress retains calibration purpose and the alert exclusion.
- The operational-alert change has both an opening change and a late decision
  explicitly replacing the earlier research-only scope; full middle text remains.
- The changed reference parameter is kept literal and reviewed as a fixture-specific
  reference revision, not normalized or removed by the reader.
- The user-owned issue's new alert scope conflicts with its retained calibration
  choice; that tension is visible and the explicit choice/target is preserved.
- Rewritten unheaded calibration text still describes calibration work; the new
  instrument issue explicitly excludes changes to production alerts.

The scenario and choices are author-designed. This is not independent model
classification quality, autonomous evidence discovery, browser interaction, live
source access, or a freshness/completeness guarantee. Registered relation and
source-fact consistency are checked separately from semantic interpretation.

## Equivalent-workload payload comparison

The [comparison script](../../scripts/bench/refresh-reading.ts) serializes the
same six candidates in focus and full mode, including the changed user-owned
observation. It includes the same full attention index and taxonomy in both totals
(3,901 bytes). Every emitted chunk is verified against an exact source substring.
Counts are UTF-8 pretty JSON plus final newline; retained inputs, output fields,
source coverage, decisions and full expansion are shared by both modes.

| Case                                              | Focus bytes |  Full bytes |
| ------------------------------------------------- | ----------: | ----------: |
| Appended progress                                 |       3,815 |      23,411 |
| Real purpose change, including late contradiction |      23,468 |      23,467 |
| Reference-only change                             |       3,866 |      23,382 |
| Changed user-owned evidence                       |       3,880 |      23,472 |
| Rewritten unheaded text                           |      24,245 |      24,383 |
| New issue                                         |       2,613 |       2,612 |
| **Total including common index/taxonomy**         |  **65,788** | **124,628** |

The total is 47.2% smaller on this deliberately bounded fixture. Both modes have
eight result pages; no reduction in call count is demonstrated. Wide changes and
new issues have no meaningful reduction and can be a byte larger because of the
view name. The unheaded case reduces only 0.6%. These ratios depend on body sizes,
edit locations, metadata and formatting; they are not general token savings.
Expanding focused results later adds output, so the table is not a measured
end-to-end model reading strategy. No model, billing, host transport, latency or
memory benchmark is included.

The [receipt](data/2026-09-28-focused-refresh/results.json) records exact prior
state/capture/reader hashes and per-case sizes. Bulk synthetic outputs remain
local. The viewer and its input contract are unchanged; hosted browser regression
is separate from the above artifact verification.
