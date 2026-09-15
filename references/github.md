# Read-only GitHub Issues collection

Use the connected GitHub tools or an already authenticated `gh` CLI. Resolve the
requested owner/repositories and user first. Keep one source per host/repository;
GitHub issue numbers are local to a repository. Do not assume the connected GitHub
account and the selected Linear user represent the same person.

Use native REST issue JSON for normalization. For an explicit repository query,
`GET /repos/{owner}/{repo}/issues` supports assignee and state filters; follow all
pagination links. With `gh`, use `gh api --method GET --paginate --slurp` and flatten
page arrays mechanically. REST issue lists include pull requests: remove entries
with `pull_request`. Fetch issue detail when the listing/tool result is incomplete.
Search results have their own completeness limits and are not proof that the
repository query is exhausted.
For a requested sample, establish its requested ordering and selection boundary
and disclose the limited scope; do not call the whole repository exhausted.
Follow [response retention](runs.md#prepare-and-retain-evidence): an authenticated
CLI can redirect response output directly to a fresh private file without model
transcription. Preserve obtained bodies; [progressive reading](reading.md)
controls model input, not the retained evidence.

For each in-scope issue, collect supported registered relations:

- `GET /repos/{owner}/{repo}/issues/{number}/parent`: save the returned issue in
  `links.parent`; record a verified no-parent result as null. A permission or
  unsupported-endpoint failure is a lookup limitation, not proof of no parent.
- `GET /repos/{owner}/{repo}/issues/{number}/sub_issues`: paginate into
  `links.children`.
- `GET /repos/{owner}/{repo}/issues/{number}/dependencies/blocking`: paginate
  into `links.blocks` (this issue is the prerequisite).
- `GET /repos/{owner}/{repo}/issues/{number}/dependencies/blocked_by`: paginate
  into `links.blockedBy` (this issue is the dependent).

Preserve the full native endpoint objects, including `node_id`, `number`, and
`html_url`. Register additional context repositories when needed. Fetch direct
context detail when needed beyond available endpoint metadata to explain or
classify it; do not recursively crawl unrelated work. Declare list-only and
failed/unperformed detail lookups instead of inferring missing facts.

Full records and relationship endpoints require a parseable, absolute HTTP(S)
`html_url` for repository resolution. Preserve `assignees` as an array of user objects with
nonblank `login` strings and `labels` as an array of nonblank strings or objects
with nonblank `name` strings. Empty arrays are valid; omit unavailable metadata.
Null or malformed collections and elements produce a diagnostic at their capture
path with a repair instruction.

GitHub's `open` alone does not prove work has started: normalize it to `unstarted`.
`closed/completed` maps to completed, `closed/not_planned` to canceled, and
`closed/duplicate` to duplicate, retaining the original state/reason label. A closed
issue without a recognized reason remains unknown, with its original state
label. Project board columns and labels are not silently substituted for status.
This native reader does not derive related/duplicate edges from prose, mentions,
or closing keywords. Explain that supported relationship coverage is parent,
child and explicit dependencies; richer source semantics need verified input.

Official API references (checked 2026-09-12):
[issues](https://docs.github.com/en/rest/issues/issues),
[sub-issues](https://docs.github.com/en/rest/issues/sub-issues), and
[dependencies](https://docs.github.com/en/rest/issues/issue-dependencies).
Endpoint availability and permissions can differ on GitHub Enterprise hosts;
record the actual observed capability instead of claiming parity.
