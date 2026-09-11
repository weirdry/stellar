# 10. Quality

State: **Target**

| Scenario | Required outcome | Evidence owner |
| --- | --- | --- |
| Re-render the prototype snapshot | Preserve the accepted tree/graph/inspector navigation and visual language | Renderer and actual browser review |
| Change owner, taxonomy, and dataset | Generate without edits to viewer source | Synthetic example and integration check |
| Expand or select an issue | Display the correct source-backed neighbors and direction | Data/scene checks and interaction review |
| Include out-of-scope context | Preserve assigned-issue totals | Classification and count checks |
| Provide invalid references or duplicate identities | Reject with an actionable diagnostic | Input validator tests |
| Refresh existing classification | Preserve explicit user decisions according to declared merge rules | Refresh behavior tests when implemented |
| Open a generated report | Read labels and details, navigate with keyboard, and export without losing meaning | Actual browser and visual review |

## Current foundation gate

State: **As-built**

`just check` and `just ci` validate the canonical corpus, indexed ADRs,
local Markdown link targets, shell syntax, ShellCheck findings, workflow syntax,
Just formatting, and whitespace. Exact commands live in
[the development guide](../development/README.md).

This gate does not establish product rendering, browser behavior, live Linear
access, package installation, hosted CI, or release acceptance. Dated
[validation records](../validation/README.md) identify observed scope.
