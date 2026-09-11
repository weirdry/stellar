# Organization standard adoption

Stellar is maintained by ed. It adopts the engineering conventions below by
explicit project direction.

## Reviewed source

Reviewed on 2026-09-12 against `5010-dev/.github` main at
[`9411f3ee4adc5cbb7f7a951e4cee1a1602fffc39`](https://github.com/5010-dev/.github/tree/9411f3ee4adc5cbb7f7a951e4cee1a1602fffc39).
The local reference checkout matched that live remote commit. The recorded
commit identifies this adoption review. Stellar's applicable contribution rules
are written directly in root CONTRIBUTING.md; that file is the local authority
for commit, branch, review, and release workflow. The remaining links identify
the engineering standards and reference material used by this repository.

| Source                                                                                                                                        | Stellar application                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 5010-dev/.github CONTRIBUTING.md, reviewed source above                                                                                       | Applicable rules incorporated directly into Stellar CONTRIBUTING.md     |
| [Developer Tooling Standard](https://github.com/5010-dev/.github/blob/main/docs/standards/developer-tooling/README.md)                        | Truthful Just commands, exact selectors/locks, local validation and CI  |
| [Golden Path bootstrap](https://github.com/5010-dev/.github/blob/main/docs/guides/bootstrap-new-repository.md)                                | Repository-owned implementation sized to actual capabilities            |
| [Golden Path examples](https://github.com/5010-dev/.github/blob/main/docs/golden-path/reference-examples.md)                                  | Reviewed action pins and thin CI shape, adapted once                    |
| [Engineering documentation](https://github.com/5010-dev/.github/blob/main/docs/standards/engineering-documentation/README.md)                 | One L0 corpus using 5010-arc42-v1                                       |
| [Documentation lifecycle](https://github.com/5010-dev/.github/blob/main/docs/standards/engineering-documentation/lifecycle-and-validation.md) | Same-change completion, evidence distinctions, structural/link checking |

Developer tooling standard reviewed: `2026.08.8`. Documentation profile adopted:
`5010-arc42-v1`. Contribution policy is maintained locally. Other adopted
engineering standards retain their stated authority; this provenance record
does not create an automatic policy update mechanism.

## Current applicability

The Node profile now applies to the repository-native JavaScript CLI and
bundled viewer: exact Node 24, pnpm 11, Prettier 3.9, flat ESLint 10, and frozen
locks. The profile permits the built-in Node test runner for a small native CLI;
Playwright supplies separately named browser checks. There is no TypeScript
artifact requiring typecheck and no compiled build or published library package.
The root package is private to prevent accidental registry publication.
No native-root map, release-unit map, central agent, or reusable conformance
workflow is needed for this single native root.

Source hosting is public under `weirdry/stellar`. The repository owns its hosted
CI definition and permits rebase merge only. Actual CI results are recorded in
GitHub Actions; workflow presence does not establish merge enforcement.
Branch rules, dependency visibility and remediation routing, license, and skill
distribution remain **Open**. Publishing obligations will be revisited with the actual distributed artifact.

## Copy-once provenance

- `scripts/docs/check-contract.sh` is adapted from the organization's
  [reference checker at the reviewed commit](https://github.com/5010-dev/.github/blob/9411f3ee4adc5cbb7f7a951e4cee1a1602fffc39/scripts/docs/check-contract.sh).
  Stellar extends the scan to tracked-source locations outside `docs` and
  checks that all L0 chapters appear in the architecture index. The common
  minimum remains intact. Link checking verifies local file targets; fragment
  meaning and factual correctness require review.
- The local PR template is a concise adaptation of the organization template.
- Canonical CI follows the organization example. Its action tags and the mise
  Linux release asset were checked at adoption; exact pins live in the workflow.

These are repository-owned source files. No command downloads policy or
regenerates them from a sibling checkout during normal checks.

## Diagram boundary

Use Archify by default for new canonical engineering diagrams and the documented
Mermaid fallback when applicable. No diagrams are required for this foundation.
When diagrams are added, keep authored source, generated views, regeneration
procedure, and applicable review evidence together. Stellar's product viewer
is its own implementation; Archify is a design/toolchain reference, not an
inherited runtime dependency.
