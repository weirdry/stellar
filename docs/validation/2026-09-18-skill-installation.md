# Node-ready skill installation — 2026-09-18

## Scope

The installation change starts from `4aae68e` and adds MIT licensing, the
generated runner and notices, direct-Node skill commands, and distribution
documentation. Viewer behavior and source/state contracts are unchanged.
No public release, main promotion, tag, or Stellar npm publication was performed.

## Isolated installation and workflow

An export containing only Git-tracked and intended new public files was copied
into a disposable Linux container using
`mcr.microsoft.com/playwright:v1.63.0-noble` (Node 24.20.0). It contained no Git
metadata, installed dependencies, ignored private files or user reports.

```sh
npx --yes skills@1.7.0 add /source --skill stellar --agent codex claude-code -g -y
```

The official installer discovered one skill and created the canonical installed
copy for Codex and a Claude Code link. The installed copy had neither `.git`
nor `node_modules`. The maintainer's existing skill symlink was untouched.

The implementing agent read the installed `SKILL.md` and exercised its workflow
on the bundled invented river-station capture from an unrelated working
directory. This was an explicit manual skill workflow, not a new Codex/Claude
Code process or an automatic-discovery test. Runtime calls used the installed
`bin/stellar.mjs`, with no tool/dependency lookup environment.

- Retained the supplied capture and preserved its original observation facts.
- Normalized and inspected all eight issue records; read the seven short bodies
  with the runner's bounded reader and authored fresh choices.
- Grouped seven assigned issues into three domains and six purpose groups;
  left the unqueried context unclassified and retained three source relations.
  Kept replay tooling separate from language evaluation, numerical production
  separate from bulletin explanation, and grouped cross-tool delivery upkeep.
- Ran `classify-draft`, `validate`, `render`, input retention, and `verify-run`
  with state: all four consistency checks passed.
- Applied a synthetic explicit user choice with `revise`, refreshed against the
  same capture, rendered again, and verified the resulting map/state/HTML.
  The choice remained user-owned; `preservedUser` contained one issue.
- Compared original capture and first-run state bytes after continuity: unchanged.

The retained response is a byte copy of an invented fixture; it is not evidence
of a live source query. No source credentials or private data were used.

## Executable regression coverage

[distribution.test.js](https://github.com/weirdry/stellar/blob/adc4a0d29690e32f216386a223ff71601f2caa87/test/distribution.test.js) copies only the generated
runner, schemas, viewer and license files into a temporary directory with spaces
in its path. It runs every product command from another directory with an empty
environment, compares installed HTML to the source renderer, checks saved user
authority and occupied-output refusal, and preserves input/prior output bytes.
A separate scratch build proves that the read-only bundle gate detects drift
without rewriting the artifact. Both new tests passed locally.

The skill-creator frontmatter validator passed using an isolated Python YAML
dependency. It validates structure, not semantics or host discovery.

## Local gates and browser evidence

- Frozen `just init`: passed with dependency build scripts disabled, including
  esbuild's postinstall. Its platform binary is supplied by the pinned optional
  dependency; no developer tool is needed inside the installed skill.
- `just ci`: passed, including the read-only bundle check and **69/69 Node tests**.
- `just browser-check`: **47/47 Chromium tests** passed on macOS.
- The installed river-station report was additionally opened in pinned headless
  Chromium at 1440 × 1000. Owner branding, three domains, seven assigned issues,
  search, issue selection, inspector, and scope control worked. There were no
  page errors or external requests. Overview and neighborhood screenshots were
  inspected; existing mid-word label wrapping remains tracked in #16.

These screenshots and command logs are local synthetic evidence, not tracked
private reports. The packaging change does not alter viewer layout.

## Remaining boundaries

The release command against default-branch `main` and a published immutable tag
cannot be release-verified before promotion/tagging. A release still needs its
exact source revision and installer acceptance. No fresh agent process,
automatic selection, live collection, Windows execution, or published release
acceptance is claimed here. Local gates, hosted CI and browser observations are
recorded separately as they complete.

## Exact-ref installation and review evidence

At implementation commit `10d26db8c56bc8bfcce8968643dc0e28aaa8d27d`, the
implementing agent also installed the exact GitHub ref with official
`skills@1.7.0` in the disposable Linux environment (Node 24.20.0). The installed
runner hash matched the committed bundle, and the synthetic generation,
user-revision and refresh workflow passed while retaining prior artifact bytes.
This was manual command replay, not fresh-host invocation or automatic discovery.

[Hosted CI 35300600085](https://github.com/weirdry/stellar/actions/runs/35300600085)
passed at `10d26db`: bundle currency, **69/69 Node**, **47/47 Chromium**.
The README-only follow-up `1c6a9af` passed local CI (**69/69 Node**) and
[hosted CI 35304473418](https://github.com/weirdry/stellar/actions/runs/35304473418)
(**69/69 Node**, **47/47 Chromium**). Local Chromium was not repeated for that
documentation-only commit; its preceding local result belongs to `10d26db`.

Independent review of [PR #18](https://github.com/weirdry/stellar/pull/18) at
`1c6a9af` reported no blocking defects, **69/69 Node** and **47/47 Chromium**
locally, and exact-ref installation with `skills@1.7.0` on Linux arm64 / Node
24.21.0. Its installed workflow used a read-only skill directory without
developer tools and with unusable external Ajv packages. Synthetic bilingual,
mixed-source generation and continuity matched the source runner; prior bytes
and user choices were preserved. Browser evidence was repository Playwright;
fresh-agent discovery, live collection and release acceptance were not tested.

The review's recorded installer reproductions showed that this repository
requires Git to install, a pinned SHA stays pinned on update, and non-interactive
removal without `-y` can exit zero without removing the skill. With `-y`, removal
completed and synthetic reports outside the installation remained unchanged.
These are observations of `skills@1.7.0`, not new installer behavior in Stellar.

## Author follow-up at `375f48d`

F1–F5 are addressed with installation prerequisites and locations, pinned-ref
update and non-interactive removal instructions, recorded renderer identity,
current architecture status, and corrected command/evidence ownership. The
verifier's mismatch guidance now refers to a runner and distinguishes verifying
an original report from creating a separate new report; the installed bundle
was regenerated. Verification logic, rendering, schemas and state are unchanged.

- `just ci`: **69/69 Node** passed, including bundle currency and isolated
  installation-runtime coverage.
- The new hash example was extracted verbatim from the run guide and executed
  under Bash and Zsh against a scratch runtime copy with spaces in its path.
  Both outputs matched independently computed hashes for all seven runner/viewer
  files, including both locale catalogs. The command changed no files.
- Manual installed-runner replay on the tracked synthetic mixed capture passed
  normalization, first classification, retention, validation, rendering, and all
  four `verify-run` checks. Changing only the scratch viewer CSS then caused only
  `bundledViewer` to fail, with the new recovery guidance. A separate new HTML
  passed; every original input, map, state and report remained byte-identical.
- The implementing agent did not repeat local Chromium or the official installer
  for this follow-up. Independent rechecks and hosted results are recorded below.

These checks used temporary synthetic artifacts. The existing skill registration,
private reports and source systems were unchanged. No fresh agent process or
automatic-discovery test was performed.

## Independent rechecks through `43eccaf`

The following observations summarize the independent review reports supplied
for PR #18 on 2026-09-18. They are separate from the implementing agent's checks
above. Installation and recovery exercises were not repeated for this
documentation-only follow-up.

- At `375f48d`, all F1–F5 findings were confirmed fixed. Exact-ref installation
  with `skills@1.7.0` on Linux / Node 24.21.0 produced the 121 tracked files,
  without `.git` or `node_modules`, and the runner hash matched the commit.
  In a separate container without development tools, the read-only installed
  skill completed all 40 expected workflow and refusal steps on invented Korean
  and English inputs despite unusable external Ajv packages. Artifacts matched
  the source runner byte-for-byte; stdout/stderr matched after path normalization.
  Prior files and user choices were preserved. The remaining N1 finding concerned
  documenting project-local recovery instead of replacing the global skill.
- At `77a12a1`, the reviewer confirmed N1 fixed by running the documented recovery
  command with real installation in Bash and Zsh from a task directory with
  spaces. Recovered `1c6a9af` and `375f48d` runners matched their recorded hashes
  and passed all four `verify-run` checks against reports from those revisions.
  A nonexistent SHA and an unreplaced `REF` failed without selecting a runner.
  The global installation, lock, Claude Code link and task directory stayed
  unchanged. Printing the recovered path remained an optional usability fix.
- At `43eccaf`, the reviewer executed that fix with `skills@1.7.0` on Linux /
  Node 24.21.0 in both Bash and Zsh. Successful recovery printed the absolute
  path as its last output line, with stdout alone or stdout/stderr combined.
  A separate shell reused the printed path: the runner hash matched `1c6a9af`
  and `--help` succeeded. A nonexistent SHA exited 1 without printing a path.
  The global installation, lock and task directory remained unchanged. No
  findings remained open in that recheck.

| Reviewed head | Independent local `just ci` | Independent local Chromium | Hosted CI                                                                                                              |
| ------------- | --------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `375f48d`     | 69/69 Node; bundle current  | 47/47                      | [35333679862](https://github.com/weirdry/stellar/actions/runs/35333679862): 69/69 Node, 47/47 Chromium; bundle current |
| `77a12a1`     | 69/69 Node; bundle current  | Not repeated               | [35338255054](https://github.com/weirdry/stellar/actions/runs/35338255054): 69/69 Node, 47/47 Chromium; bundle current |
| `43eccaf`     | 69/69 Node; bundle current  | Not repeated               | [35339612519](https://github.com/weirdry/stellar/actions/runs/35339612519): 69/69 Node, 47/47 Chromium; bundle current |

The hosted runs checked merge refs `f05594f`, `11f4f8b` and `3c5cd12`,
respectively; each tree matched its reviewed head. Runtime and bundle bytes
are unchanged after `375f48d`, so its installed-workflow and local Chromium
evidence remains applicable to the two documentation-only follow-ups.

These rechecks used isolated checkouts and disposable containers with synthetic
inputs. Fresh agent invocation, automatic discovery, live collection, macOS or
Windows installation, and published-tag acceptance remain unverified. Host-browser
inspection was not performed; the recorded Chromium results use repository
Playwright. No main promotion or release is established by these results.
