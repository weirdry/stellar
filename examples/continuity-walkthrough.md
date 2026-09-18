# First report, user correction and refresh

State: **As-built**

This local walkthrough uses only the invented observatory in
[mixed-capture.json](mixed-capture.json) and its authored
[mixed-choices.json](mixed-choices.json). It makes no source requests and is not
an anonymized real capture. The example taxonomy is one interpretation, not a
required vocabulary. See the [artifact ownership view](../docs/architecture/05-building-block-view.md#artifact-ownership-and-continuation)
for file responsibilities and the [continuity guide](../references/continuity.md)
for the complete contract.

Run these blocks in order in one shell from a prepared repository checkout
([setup](../CONTRIBUTING.md#development-setup-and-quality-gates)). They use
contributor `just` commands; installed skills use the equivalent bundled-runner
commands in [SKILL.md](../SKILL.md). Only a temporary directory of synthetic
files is created. A new directory makes the walkthrough repeatable without
replacing earlier runs. Do not pre-create the numbered run directories.
Continue to the next block only after the current step succeeds, except for the
expected validation rejection described in step 3. If setup fails, stop and
correct the error before retrying. These blocks do not change shell options.

## 1. Generate the first report

```sh
if stellar_demo="$(mktemp -d "${TMPDIR:-/tmp}/stellar-continuity.XXXXXX")"; then
  just normalize examples/mixed-capture.json "$stellar_demo/draft.json" &&
    just classify-draft "$stellar_demo/draft.json" examples/mixed-choices.json "$stellar_demo/01-first" &&
    just render "$stellar_demo/01-first/work-map.json" "$stellar_demo/01-first/stellar.html" &&
    just verify-run examples/mixed-capture.json "$stellar_demo/01-first/work-map.json" "$stellar_demo/01-first/stellar.html" "$stellar_demo/01-first/state.json"
else
  printf '%s\n' 'Temporary directory creation failed. Stop here and correct TMPDIR before retrying.' >&2
fi
```

The first run contains four assigned issues and one context issue. All four
assigned issues have agent-owned classifications; context contributes no count.
`OBS-1` and `OBS-2` initially share `transit`. Repeated GitHub `#7` labels remain
distinct by source namespace. Verification reports all four comparisons as
`pass`; it does not approve the meaning of the example grouping.

## 2. Record a specific user correction

Assume the user explicitly asks: “Give detector calibration its own group and
mark it for Spring observation readiness.” The following builds choices from
`OBS-1`'s canonical current-map ID, adds the requested category under the existing
research domain, and sets the target. It does not change source facts.

```sh
node --input-type=module - "$stellar_demo" <<'JS'
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const map = JSON.parse(fs.readFileSync(path.join(root, '01-first/work-map.json')));
const issue = map.issues.find(item =>
  item.sourceId === 'linear-observatory' && item.nativeId === 'invented-linear-uuid-1');
const choices = {
  categories: [{ id: 'calibration', domain: 'research', label: 'Detector calibration',
    basis: 'Detector calibration as a distinct requested outcome' }],
  issues: [{ issueId: issue.id,
    classification: { category: 'calibration',
      rationale: 'The user separates detector calibration from transit evaluation.' },
    targets: ['Spring observation readiness'] }]
};
fs.writeFileSync(path.join(root, 'user-choices.json'), JSON.stringify(choices, null, 2));
JS
just revise "$stellar_demo/01-first/state.json" "$stellar_demo/user-choices.json" "$stellar_demo/02-user"
```

`revise` records user ownership for classification and targets independently.
The correction uses an explicit user request; an agent should use `classify` for
its own judgment. Continue from `02-user/state.json`, which now owns this choice.
Neither the original HTML nor browser navigation records the revision.

## 3. Refresh changed observations

Simulate a later capture by changing `OBS-1`'s title/status and `OBS-2`'s body.
The former tests the user correction; the latter tests an agent classification
whose purpose evidence changed. Keep source identities and relationships intact.
The timestamp is synthetic; no live freshness claim is made.

```sh
node --input-type=module - "$stellar_demo" <<'JS'
import fs from 'node:fs';
import path from 'node:path';
const capture = JSON.parse(fs.readFileSync('examples/mixed-capture.json'));
for (const source of capture.sources) source.snapshotAt = '2026-09-13T12:00:00Z';
const calibration = capture.records.find(record => record.data.uuid === 'invented-linear-uuid-1');
calibration.data.title = 'Calibrate and validate the transit detector';
calibration.data.status = 'Done';
calibration.data.statusType = 'completed';
const evaluation = capture.records.find(record => record.data.uuid === 'invented-linear-uuid-2');
evaluation.data.description = 'Compare false-positive rates across two simulated transit campaigns after calibration.';
fs.writeFileSync(path.join(process.argv[2], 'next-capture.json'), JSON.stringify(capture, null, 2));
JS
just refresh "$stellar_demo/02-user/state.json" "$stellar_demo/next-capture.json" "$stellar_demo/03-refreshed"
```

The fresh run is valid saved state but its map is not yet renderable:

| Issue                        | Result after refresh                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OBS-1`                      | Current title/status update; user-owned `calibration` and `Spring observation readiness` survive.                                                              |
| `OBS-2`                      | Current body updates; its agent classification is withheld with `purpose-text-changed` review. The prior classification and evidence remain in private memory. |
| Both GitHub `#7` issues      | Unchanged facts and agent classifications carry forward; their shared target remains intact.                                                                   |
| GitHub delivery `#8` context | Remains context, unclassified and outside assigned totals.                                                                                                     |

Inspect `03-refreshed/changes.json` and `state.json`. A direct `just validate`
on its `work-map.json` exits 1 with `missing-classification` for `OBS-2`; saving
state is not report completion. A target-only edit would not resolve this review.
Do not restart from the old HTML or bootstrap `remember` from the current map:
that would not preserve the existing state's full decisions and ownership.

## 4. Review the changed evidence and finish

For this invented body, the outcome still belongs to transit detection. Apply
that explicit agent decision only to `OBS-2`, keeping the user's fields intact.
In an actual run, inspect/read the changed source evidence before deciding;
the fixed rationale below is specific to this supplied synthetic text.

```sh
node --input-type=module - "$stellar_demo" <<'JS'
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2];
const state = JSON.parse(fs.readFileSync(path.join(root, '03-refreshed/state.json')));
const issue = state.map.issues.find(item =>
  item.sourceId === 'linear-observatory' && item.nativeId === 'invented-linear-uuid-2');
const choices = { issues: [{ issueId: issue.id, classification: { category: 'transit',
  rationale: 'The revised evidence still evaluates false positives in transit detection across simulated campaigns.' } }] };
fs.writeFileSync(path.join(root, 'review-choices.json'), JSON.stringify(choices, null, 2));
JS
just classify "$stellar_demo/03-refreshed/state.json" "$stellar_demo/review-choices.json" "$stellar_demo/04-reviewed"
just validate "$stellar_demo/04-reviewed/work-map.json"
just render "$stellar_demo/04-reviewed/work-map.json" "$stellar_demo/04-reviewed/stellar.html"
just verify-run "$stellar_demo/next-capture.json" "$stellar_demo/04-reviewed/work-map.json" "$stellar_demo/04-reviewed/stellar.html" "$stellar_demo/04-reviewed/state.json"
```

All assigned classifications are complete and all four artifact comparisons
pass. Open the final `stellar.html` in a browser for visual review; on macOS:

```sh
open "$stellar_demo/04-reviewed/stellar.html"
```

Retain `04-reviewed/state.json` for the next operation, together with the selected
capture, choices, report and handoff evidence. Earlier runs remain intact. Real
reports need the [private run and retention rules](../references/runs.md), not
this example's temporary location. This path demonstrates one explicit lineage;
absence/reappearance, identity uncertainty, output failures and arbitrary semantic
classification remain separate cases documented in the continuity/runtime guides
and their tests. Local artifact verification is not source-collection, browser
interaction or live-host acceptance.
