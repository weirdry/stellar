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
Follow [response retention](collection.md): an authenticated
CLI can redirect response output directly to a fresh private file without model
transcription. Preserve obtained bodies; [progressive reading](reading.md)
controls model input, not the retained evidence.

## Retain list responses before model delivery

For a full repository/assignee query, set `REPOSITORY` to the confirmed
`owner/repo`, `ASSIGNEE` to the selected login, and `STAGING` to an absolute private
staging directory selected under the run location policy. Run the following in
the host shell; adapt the filters to the requested scope before collection.
This example exhausts the list and is not a recent-N sampling recipe. It requires
an already authenticated `gh` and Node 24. Source relation collection below is
still required for the requested coverage.

```bash
(
  set -euo pipefail
  umask 077
  : "${REPOSITORY:?Set the selected owner/repo}"
  : "${ASSIGNEE:?Set the selected login}"
  : "${STAGING:?Set the absolute private staging directory}"
  mkdir -p "$STAGING/evidence/raw"
  completed_response="$STAGING/evidence/raw/assigned-pages.json"
  if [ -e "$completed_response" ] || [ -L "$completed_response" ]; then
    printf '%s\n' 'Completed response path is occupied; choose a fresh collection destination.' >&2
    exit 1
  fi
  partial_response=$(mktemp "$STAGING/evidence/raw/assigned-pages.partial.XXXXXX")
  gh api --method GET --paginate --slurp \
    "/repos/$REPOSITORY/issues" -f assignee="$ASSIGNEE" -f state=all \
    > "$partial_response"
  node --input-type=module - "$partial_response" "$completed_response" <<'NODE'
import { readFile, link, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const bytes = await readFile(process.argv[2]);
let pages;
try { pages = JSON.parse(bytes.toString('utf8')); }
catch { throw new Error('The retained response is not valid JSON; keep it as failed evidence.'); }
if (!Array.isArray(pages) || !pages.every(Array.isArray))
  throw new Error('Expected retained REST page arrays.');
const records = pages.flat();
if (!records.every(record => record && typeof record === 'object' && !Array.isArray(record)))
  throw new Error('Expected native REST issue objects.');
// Exclusive creation also refuses a destination occupied during collection.
await link(process.argv[2], process.argv[3]);
await unlink(process.argv[2]);
console.log(JSON.stringify({
  responseFile: process.argv[3],
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  pages: pages.length,
  issues: records.filter(record => !record.pull_request).length,
}));
NODE
)
```

The response goes straight to a fresh private `assigned-pages.partial.*` file;
only metadata reaches shell stdout. Only after retrieval and page validation
succeed is it linked to `assigned-pages.json`, without replacing any destination,
and the temporary name removed. The final name identifies a completed local
collection attempt, not proof of provider completeness or relationship coverage.
An occupied final path is refused before `gh` runs and checked again when linking.
A failed request or malformed JSON/page shape leaves its partial file and exits
without a success summary or final file. Even valid JSON in a partial file is not
completed evidence. Preserve it; rerun the recipe with the same `STAGING` for a
deliberate retry, which allocates a fresh partial filename. After success, choose
a new collection destination for another query. Record query arguments,
observation times, exit status, pagination and lookup outcomes in the collection
account. Build captures only from completed responses.

Build the capture mechanically from the retained pages: flatten arrays, exclude
`pull_request` entries from issue records, and keep each selected native issue
object unchanged, including its body. Retain the original pages even when they
include pull requests. Use the same direct-to-file approach for the required
detail and relationship requests; filenames must be fresh for every response.
Do not print the raw file or ask the model to transcribe it into another JSON file.

A host orchestration facility may instead retain a tool's actual return value
before returning a summary to the model. Inspect its real wrapper: data may be
in `structuredContent` or JSON text under `content`. A normalized connector
issue is not necessarily native REST JSON; do not invent missing `node_id`,
`number`, or `html_url` fields. Use the supported native route or disclose the
capture limitation. Hosts that already deliver full responses to the model can
still retain evidence, but this cannot retroactively reduce that input. The
recipe establishes a transfer route, not measured token savings or host parity.

## Collect registered relations

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
Before skipping a redundant request, [carry already-obtained complete endpoint
detail into a deduplicated context record](capture.md#carry-obtained-endpoint-detail-into-records).
Keeping it only in `links` does not expose its body/status to the map or reader.

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
