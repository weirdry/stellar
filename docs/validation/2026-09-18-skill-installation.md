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

[distribution.test.js](../../test/distribution.test.js) copies only the generated
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

## Review follow-up after `1c6a9af`

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
- Local Chromium and the official installer were not repeated for this follow-up.
  Existing installation and browser observations remain attributed to their
  revisions above; hosted results for the follow-up are recorded in PR #18.

These checks used temporary synthetic artifacts. The existing skill registration,
private reports and source systems were unchanged. No fresh agent process or
automatic-discovery test was performed.
