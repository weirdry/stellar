# Durable default output location

Date: 2026-09-15

State: **As-built**

## Scope

The skill selects the current request's output directory first, then an output
location established in the conversation. Otherwise it uses
`~/Documents/Stellar/`. The agent resolves paths before invoking the existing
CLI; the CLI still requires output arguments. Each generation or refresh uses a
fresh run directory. Prior artifacts and saved state are not relocated.

Boundary classification: unreleased — corrected in place. No capture, map or
state schema changed, and no existing user data was rewritten.

## Local evidence

- The skill-creator quick validator accepted the updated skill entry.
- `just ci` passed all 51 Node tests and the documentation, formatting, lint and
  repository checks. No dependencies, runtime code or test contracts changed.
- The lead agent explicitly applied the updated skill to one newly invented
  rainfall-calibration issue. This was manual invocation evidence, not an
  automatic discovery or independent-host test. No live source was contacted.

The synthetic workflow used root Just commands from the skill checkout while
resolving destinations independently of it:

| Request context                                                       | Agent-selected destination                                | Observed result                                                                   |
| --------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| No output preference                                                  | Fresh validation child of the real `~/Documents/Stellar/` | Normalize, classify, validate, remember, render and verify completed              |
| Explicit relative directory, with input state in the default location | Fresh run under the task directory's `chosen reports/`    | Refresh, validate, render and verify completed; spaces in the path were preserved |
| Follow-up retains that established output directory                   | Second fresh run under `chosen reports/`                  | Refresh, validate, render and verify completed                                    |

Initial classification was authored by the agent in the normalized draft;
`remember` created the final default run with its saved state. Both subsequent
refreshes retained the classification and reported zero pending reviews.
All three `just verify-run` calls passed `captureFacts`, `embeddedMap`,
`bundledViewer` and `stateMap`. Prior-run file hashes remained unchanged across
refreshes. Reusing an existing run path was refused with a `run-output`
diagnostic, and a further hash comparison confirmed that all artifacts remained
unchanged.

Path selection in this exercise was performed by the agent following the skill,
not by a new resolver or automated prompt-adherence test. The synthetic capture,
HTML, state and command logs remain local; no private pilot data was used.

## Limits

No new browser or visual inspection was performed locally because viewer code,
rendering and the input contract are unchanged. This exercise does not prove
automatic discovery, another agent host's path selection, filesystem access on
another machine, live source collection, installation or publication. Hosted CI
results belong to the exact PR head and are reported separately in the PR.
