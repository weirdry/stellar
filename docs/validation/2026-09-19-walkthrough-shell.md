# Interactive walkthrough correction — 2026-09-19

## Scope and correction

The re-review of [PR #21](https://github.com/weirdry/stellar/pull/21) at
`35c8d97fbbfb99764422356229bd57513fe8e032` found that the walkthrough's `set -e`
could terminate the reader's interactive shell on a later failure, including
the deliberately invalid refreshed map. The earlier walkthrough check exercised
script execution and did not establish interactive-shell behavior.

The [walkthrough](../../examples/continuity-walkthrough.md) now preserves shell
options. Its first block runs only after successful temporary-directory
allocation, chains dependent commands with `&&`, and reports allocation failure
without executing the runner. Instructions require a successful step before
continuing, except for the documented pending-classification rejection.

This record covers that revision plus the small documentation correction. The
previous [follow-up record](2026-09-19-review-follow-up.md) remains historical;
its global shell-error-stopping approach is replaced by this scoped guard.

## Local evidence

The actual Markdown shell blocks were fed to separate interactive bash and zsh
processes with user startup files disabled. Each reported the interactive flag;
shell options before and after the commands were identical. All eight cases
passed, using only invented fixtures and disposable temporary directories:

- Full generation, user correction, refresh and reconsideration in each shell,
  with and without a trailing slash in `TMPDIR` (four runs). Initial and final
  reports passed all four artifact comparisons. User classification/targets
  survived refresh, and changed agent evidence required review before resolution.
- In every full run, the pending map's direct validation and a repeated command
  against an existing run each exited 1. Following commands still executed and
  the shell remained available.
- A nonexistent `TMPDIR` parent in each shell produced the allocation diagnostic,
  invoked no runner command, and left the shell available (two cases).
- An injected first-runner-command failure in each shell stopped the remaining
  chained commands and left the shell available (two cases).

Checked walkthrough SHA-256:
`239513d80cb2b8c9a0c2b62333daa06c8b198dc9a0c3256a3b29e3f84b490000`.
Probe scripts, logs and the hash-bound receipt remain in ignored
`outputs/canonical-docs/walkthrough-shell/`. The final browser-opening block was
not executed. No live source access or private user data was involved.

## Evidence boundary

Product code, diagrams, branding, schemas and historical ADRs are unchanged.
No new local browser or image review is needed for this shell-instruction edit;
earlier evidence applies to the unchanged artifacts. Commit-hook, clean-checkout
and hosted CI outcomes belong to the PR. This correction does not merge, release
or update an installed skill, and it does not override a reader's pre-existing
shell options.
