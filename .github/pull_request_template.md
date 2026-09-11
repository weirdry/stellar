<!--
Title: use Conventional Commits — e.g. `feat(scope): …`, `fix(scope): …`, `refactor(scope): …`.
Conventions: no Linear ID in the branch name or commit subject — link planning at the bottom instead.
History should be ready for rebase + fast-forward (no merge or squash commits).
Keep the PR focused; a reviewer should grasp it in a few minutes. Delete any section that doesn't apply.
-->

## Summary

<!-- What this change does and why, in one short paragraph. The reviewer should understand the purpose from this alone. -->

## Scope & non-goals

<!-- What's included, and what this PR deliberately does NOT change. -->

## Type of change

- [ ] ✨ Feature (`feat`)
- [ ] 🐛 Fix (`fix`)
- [ ] ♻️ Refactor (`refactor`)
- [ ] ⚡ Performance (`perf`)
- [ ] 🧹 Chore / build / tooling (`chore`)
- [ ] 📝 Docs (`docs`)
- [ ] ✅ Tests (`test`)

## What changed

<!-- Area-level overview so the reviewer knows where to look. One bullet per area. -->

-

## Key decisions

<!-- Notable implementation/design decisions and the alternatives weighed. Omit for a mechanical change. -->

## Verification

<!-- How this was verified — list the actual commands run and their outcome (e.g. `just ci`, `pnpm test`, `cargo test`). -->

- [ ] Lint / format / type checks pass
- [ ] Tests pass; new behavior has deterministic tests
- [ ] Build / production image succeeds (if affected)

<!-- For larger or higher-risk changes, add a short paragraph on what was tested manually. Specifics beat ticks. -->

<details>
<summary>Screenshots / recordings (UI changes)</summary>

<!-- Before / after pairs for any user-facing change. Delete if not applicable. -->

</details>

## Risks & rollback

<!-- Delete entirely for docs / chore / test PRs. -->

- **Production failure mode:** <!-- what breaks in prod if this is wrong -->
- **Rollback:** <!-- how it's triggered — revert + redeploy prior image, migration down, manual intervention, … -->
- **Breaking changes:** none <!-- or describe + migration path -->
- **Migrations / data:** none <!-- or list + reversibility -->
- **Env / config / secrets / flags:** none <!-- new vars, SSM/Amplify/infra changes -->

## Pre-integration checklist

- [ ] Self-reviewed the diff; no leftover debug code, logs, or commented-out blocks
- [ ] Reproducible from a clean checkout (fresh install + the repo's check/test gate)
- [ ] No secrets, credentials, or large runtime artifacts committed
- [ ] Docs / README / API reference updated where behavior changed
- [ ] Canonical architecture / ADR / runbook / validation evidence updated where boundaries or operations changed
- [ ] ECS delivery-boundary changes (task definition, image identity, deployment semantics, target/approval boundary, rollback, or health/readiness) complete the [organization workflow checklist](https://github.com/5010-dev/.github/blob/main/docs/platform/ecs-service-delivery-workflow-standard.md#pull-request-conformance-checklist) or link an accepted exception; pin/dependency/tool-only updates with unchanged delivery semantics are N/A
- [ ] Branch is current with the base; commits are independently understandable and ready for rebase + fast-forward

## Repository authority and history (optional)

<!-- Link repository-owned contracts, ADRs, evidence, and relevant prior PRs. External planning systems are coordination context, not authority or evidence. -->

-
