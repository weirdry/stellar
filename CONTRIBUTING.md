# Contributing to Stellar

This document defines Stellar's commit, branch, review, validation, and release
rules. Contributors can follow the complete workflow from this repository.

## Working language

Write repository documentation, commit messages, issue titles and bodies, pull
requests, comments, and Project updates in English. Preserve exact code,
identifiers, source text, and diagnostic output when quoting evidence. This
policy does not change conversation language, the requested language of a user
report, or the viewer's supported locales.

## Branch strategy

Stellar uses a simplified Gitflow model with linear integration and release
history.

| Branch        | Role                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `main`        | Validated release branch and the only source for eventual publication or production deployment |
| `dev`         | Development and integration branch for the next release; no deployment target                  |
| Work branches | Isolated feature, fix, refactoring, documentation, test, or maintenance work                   |

All changes reach `main` through promotion from `dev`. Do not implement changes
directly on `main`, including hotfixes, unless the maintainer explicitly directs
an exception. CI triggers and path filters do not redefine branch roles.

During initial local bootstrap, prepare the first changes on `dev`. Creating a
remote or the first commit is a separate maintainer action. The remote commands
below apply only after `origin` and the referenced branches actually exist;
do not invent an empty commit, remote, or deployment to follow an example.

## Direct development or a pull request

Direct commits to `dev` are allowed. They are often appropriate for small fixes,
documentation, and routine maintenance, but are not restricted to those types.

Use a dedicated work branch and pull request when a change is substantial,
risky, benefits from review, or should be discussed independently. Start work
branches from the latest `origin/dev` and target `dev` for integration PRs.

Use descriptive, purpose-based branch names. Recommended prefixes include:

- `feature/...`
- `fix/...`
- `refactoring/...`
- `docs/...`
- `test/...`
- `chore/...`

For example, `feature/work-map-renderer` describes the work. Do not include
Linear or other tracker identifiers in branch names; put planning context in
the PR body.

## Issue management

Stellar uses [GitHub Issues](https://github.com/weirdry/stellar/issues) as the source of
truth for project development and maintenance work. Track feature planning,
bugs, research, refactoring, documentation, testing, and operational improvements
there. Issues own the agreed work scope, acceptance criteria, ownership, and
progress; repository documents and executable evidence own technical facts.

### Creating and maintaining an issue

Search existing issues before creating one. Reuse an issue when it already
tracks the same outcome. Create an issue for work that needs planning, ownership,
discussion, or follow-up. A small, self-contained correction can be explained in
its commit or PR when it needs no separate tracking.

Use the repository-local [work template](.github/ISSUE_TEMPLATE/work.md) for all
work types. Web, CLI, and API authors use the same five sections: Purpose, Work,
Acceptance criteria, Out of scope, and References. Retain the headings, replace
placeholders, and remove instructional comments. Use `N/A` with a short reason
where a section does not apply. CLI/API authors must read and fill the template;
the web template chooser does not enforce their issue bodies.

Keep the body current as work progresses: check completed work, retain open
questions, and update the acceptance criteria only when the agreed scope changes.
Link detailed design and validation evidence under References. Add comments for
substantive decisions, blockers, or coordination; do not repeat a body update as
a routine status comment. Write all authored issue content in English.

GitHub displays issue templates from the default branch, `main`. Adding a
template to `dev` makes it available in that checkout; the web chooser uses it
after the normal fast-forward promotion to `main`.

### Work structure and planning

- Use a parent issue and native sub-issues when parts need independent owners,
  statuses, or acceptance criteria. Use checkboxes for steps within one task.
- Record actual blocking dependencies with GitHub's issue relationships.
- Use assignees for ownership and labels for the kind or area of work.
- Use milestones for a concrete release or shared target, when one exists.
- Add tracked work to the [Stellar Project](https://github.com/users/weirdry/projects/2). Keep
  workflow status in its `Status` field and priority in its `Priority` field.
  Use `Backlog → Todo → In Progress → In Review → Done`, and priority options
  `Urgent`, `High`, `Normal`, and `Low`. Do not duplicate status or priority in
  labels. Keep the Project status consistent with the issue's completion state.
- Treat Project updates as part of issue maintenance; do not assume automation
  keeps the two in sync. For canceled or duplicate work, record the closure
  reason and clear its workflow status instead of presenting it as Done.
- The Project is private, following the Crew reference. Stellar issues and PRs
  are public: adding them to a private Project does not make their contents
  private. Keep source captures, private reports, credentials, and session logs
  out of issue bodies, attachments, and Project fields.

### Linking work and recording completion

Link the issue from related PRs and record implementation commits when work is
committed directly to `dev`. For a PR targeting `dev`, use a reference such as
`Refs #123` and add a Development link when applicable. Closing keywords such as
`Closes #123` in a PR body only take effect for PRs targeting the default branch;
they do not close issues when a PR targeting `dev` is merged.

Close an issue as completed only after its acceptance criteria are met. Update
the body with completed work and supporting PR, commit, document, or validation
links, then close it explicitly and update its Project status if applicable.
Close canceled or duplicate work with the reason and replacement link when one
exists; do not present it as completed work.

Development integration, release, installation, and live validation are distinct
outcomes. An implementation issue may finish after `dev` integration and its
required checks; an issue that promises installation or live validation stays
open until that evidence exists. Track release scope through the relevant
milestone and release evidence. Do not create a separate issue or release gate
for every internal step.

## Commit messages

Every commit follows Conventional Commits:

```text
type(scope): imperative summary

- Explain the resulting behavior and why it is needed.
- Add relevant details that the diff does not explain.
```

The scope is optional. When present, use a short, lowercase, kebab-case name
such as `viewer`, `schema`, `repo`, or `docs`. Write an imperative summary that
describes the outcome. Separate the body from the subject with a blank line;
use a body for non-trivial rationale, consequences, or follow-up details.

| Type       | Use                                                |
| ---------- | -------------------------------------------------- |
| `feat`     | New user- or consumer-facing capability            |
| `fix`      | Bug fix                                            |
| `docs`     | Documentation-only change                          |
| `refactor` | Internal restructuring without a behavior change   |
| `test`     | Test-only change                                   |
| `build`    | Build system, dependency, or packaging change      |
| `ci`       | CI/CD configuration change                         |
| `chore`    | Repository maintenance not covered by another type |
| `perf`     | Performance improvement                            |
| `revert`   | Reversion of an earlier commit                     |

Examples:

```text
chore(repo): establish the development foundation
docs: explain the classification authority
fix(viewer): preserve selection when filters change
```

For an actual breaking contract change, use `!` after the type or scope and
explain the break in a `BREAKING CHANGE:` footer. A development refactor does
not imply that a released compatibility boundary exists.

Do not put Linear or other tracker identifiers in the commit subject. Link
issues, decisions, and related PRs in the PR body. Keep commits focused and
independently understandable so that rebase integration preserves useful history.

## Development setup and quality gates

After cloning or creating a worktree, install the repository-pinned tools and
dependencies and enable repository-managed hooks through `just init`. The README
contains first-time mise setup instructions.

- `just init` prepares locked development tools, dependencies when present, and
  local hooks. It does not mutate production/shared state or require production
  secrets.
- `just check` is the complete local, non-mutating quality gate.
- `just ci` uses the same checking path and adds applicable build, package, or
  generated-artifact validation when those capabilities exist.

Exact tool selectors and locks belong to this repository. Dependency installation
in CI must use locked or frozen mode. Formatting writes, generation, publication,
and deployment are separate explicit operations, not side effects of a quality
gate. Do not add successful placeholder commands for capabilities that do not
exist.

Run `just ci` after a rebase and before handing off a change or opening/updating
a multi-commit PR. The pre-commit hook invokes the same gate; the commit-message
hook validates the subject. Do not bypass hooks with `git commit --no-verify`.

The current local gate validates documentation structure and diagram consistency, formatting, schema-derived declarations, strict Node/viewer/test TypeScript coverage,
type-aware lint, generated viewer/runner drift checks, repository tooling, and Node unit/CLI tests. Run `just browser-check` for changes
to viewer behavior, rendering, or its input contract; install Chromium explicitly
with `just browser-install` first. Hosted CI runs both gates on synthetic inputs.
Neither gate proves live source access, skill installation, or publication.
For skill workflow changes, also validate the skill entry and exercise an
explicit invocation with synthetic input in a separate output directory. Keep
source access, local linking, invocation, and automatic discovery evidence distinct.

## Direct commits to dev

Synchronize `dev`, make the change, and run the required gate before committing:

```sh
git switch dev
git pull --ff-only origin dev

# Make the scoped change.
just ci
git add <changed-paths>
git commit
git push origin dev
```

Stage only the intended change. Do not force-push `dev` or `main`.

## Pull request workflow

1. Fetch the current remote state and create a work branch from `origin/dev`.
2. Make focused changes with Conventional Commits.
3. Rebase onto updated `origin/dev` when necessary, resolve conflicts, and rerun
   the complete applicable gate.
4. Push the work branch and open a PR targeting `dev`.
5. Complete [.github/pull_request_template.md](.github/pull_request_template.md)
   in English, following the template requirements below.
6. Finish review and all applicable required checks before integration.
7. Integrate with rebase merge.

```sh
git fetch origin
git switch -c feature/work-map-renderer origin/dev

# Later, on the same work branch, synchronize before review.
git fetch origin
git rebase origin/dev
just ci
```

Do not merge `dev` into a work branch. Do not use merge commits or squash merge.
When an already-pushed work branch needs rewritten history, coordinate with its
collaborators and use `--force-with-lease` rather than an unconditional force push.
This does not permit rewriting shared `dev` or `main` history.

Report local checks, hosted CI, browser/visual review, publication, and runtime
acceptance separately. Unperformed checks must not be described as passed.
The GitHub repository permits rebase merge and disables merge-commit and squash
integration. Local hooks and passing CI do not by themselves establish remote
branch protection or required-check enforcement.

### Pull request template requirements

Every new or substantially updated PR must use the repository-local
[PR template](.github/pull_request_template.md). Use its applicable headings and
checklists. The local file is the source for PR authoring.

- Write the title and body in English. Use a Conventional Commit title and
  keep tracker identifiers in the optional history section, not the title.
- Link tracked work with `Refs #123` and follow the explicit issue-completion
  procedure above for PRs targeting `dev`.
- Explain the problem and resulting behavior in Summary. State scope and
  non-goals, select the applicable change types, and summarize changes by area.
  Record significant decisions when they help review.
- In Verification, list actual commands and outcomes. Check only completed
  applicable items. Mark an inapplicable item `N/A` with a short reason or
  remove it; do not check it as passed. Keep local, hosted CI, visual, and
  publication evidence distinct. UI evidence must use synthetic data in this
  public repository; private reports and screenshots stay local.
- Follow the template's instructions for optional sections. Remove Risks &
  rollback for documentation, maintenance, or test-only PRs. Otherwise describe
  the actual affected boundary and recovery, breaking changes, data, and
  configuration impact. An unreleased local artifact does not imply a
  production deployment, migration, or compatibility obligation.
- Complete the applicable pre-integration checklist. The ECS delivery item
  applies only to actual ECS delivery-boundary changes; it is `N/A` for the
  current local renderer. Link repository-owned contracts and evidence in the
  optional authority/history section when useful.

Remove instructional comments and empty placeholders from the submitted body.
When scope changes, rewrite the title and body to describe the final change.

## Promoting dev to main

Promotion is fast-forward-only. Validate the development revision, then advance
`main` to that history without creating a merge commit:

```sh
git switch dev
git pull --ff-only origin dev
just ci

git switch main
git pull --ff-only origin main
git merge --ff-only dev
git push origin main

git switch dev
```

If fast-forward promotion fails, stop and resolve the divergence deliberately.
Do not replace `--ff-only` with a merge commit or force push. A passing check on
`dev` is not itself a release or deployment. Configure publication only when
the real artifact, destination, and validation path have been defined.

## Canonical documentation and evidence

Follow the repository-owned [canonical documentation policy](docs/development/documentation.md).
The `docs/architecture/` corpus is the canonical engineering current view.
Update it in the same change when responsibilities, contracts, invariants,
runtime behavior, deployment, security, or quality expectations change.

Use explicit implementation states:

- **As-built:** verified implemented or observed behavior.
- **Target:** accepted direction that is not fully implemented.
- **Open:** undecided or unverified.
- **Deprecated:** historical behavior with an identified replacement or retention rule.

Code, schemas, tests, and configuration own executable facts. Validation records
own dated observations. Architecture explains the current system and points to
those owners. Issues, PR discussions, and agent conversations provide context;
they are not substitutes for canonical documentation.

Record consequential decisions in indexed ADRs. Update the current view and add
a replacement decision when an accepted decision changes. Move Target claims to
As-built only after verifying their owning evidence. Add runbooks when actual
operations and recovery procedures exist.

Use Archify by default for new or substantively revised canonical engineering
diagrams. Keep JSON source, delivered HTML and its exported SVG together. Embed
the SVG in the owning chapter and link the source and explorable HTML. Follow the
[diagram generation guide](docs/architecture/diagrams/README.md), run
`just diagrams-check`, and record structural, semantic, browser and visual review
separately.
Mermaid is allowed when Archify is unavailable, execution is constrained, or the
required meaning or notation cannot be adequately represented; record a brief
reason in the change description. Existing diagrams do not require wholesale
conversion. This documentation rule does not make Archify a product dependency.

### Agent entry documents

[RULES.md](RULES.md) is the single source of repository-wide agent instructions.
[AGENTS.md](AGENTS.md) directs agents to read it;
[CLAUDE.md](CLAUDE.md) imports it with `@RULES.md`. Keep both entry documents to
one line and maintain shared instructions only in `RULES.md`. Contribution and
issue-management procedures remain in this document and are referenced there.
The product's [SKILL.md](SKILL.md) remains the work-map workflow, not repository
contribution policy.

When adopting another agent tool, use its supported entry/reference mechanism.
Verify in a fresh session that it loads `RULES.md`; static file and link checks
alone do not establish runtime loading.

## Release boundaries and user data

Publish only from validated `main` through the repository's defined release
workflow. Published tags, versions, and artifacts are immutable; corrections use
a new version rather than moving a tag or overwriting an existing artifact.

The first public distribution boundary is `v0.1.0`. Published tags and their
capture, work-map and saved-state contracts are distributed artifacts; existing
saved files are durable user data. Before changing a published contract, identify
the exact artifacts and consumers that must remain usable and choose the smallest
compatible change. Unreleased development intermediates may still evolve in
place where no real consumer or durable state requires preservation. Do not add
speculative version chains, dual readers, or migrations. Preserve correctness
identities and ordering rules for their actual purpose.

Never delete, reset, or rewrite user data merely to simplify development. Keep
real issue data and generated user reports outside the repository by default,
following the [run location policy](references/runs.md#choose-the-run-location).
For repository-local development, use ignored `local/` and `outputs/` directories.
Use entirely invented synthetic examples in tracked fixtures, not renamed or
anonymized copies of real work. Keep real-data derivatives, including HTML, SVG,
screenshots and logs, out of Git and public CI. Inspect staged paths and contents
before committing; do not rely only on ignore rules. Do not commit secrets,
credentials, or machine-specific paths.

Stellar uses the MIT license and GitHub-hosted skills installation. Follow the
[distribution guide](docs/development/distribution.md) for bundle generation,
installation checks and the manual release procedure. Published versions and
their exact source commits are recorded in GitHub Releases.
Exceptions to this workflow require explicit maintainer direction and a durable
record of their scope, reason, risk, owner, review condition, and exit condition.
