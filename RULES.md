# Working in Stellar

This file is the single source of repository-wide agent instructions. Maintain
shared rules here; keep tool-specific entry documents as references to this file.

Read [CONTRIBUTING.md](CONTRIBUTING.md), the [documentation index](docs/README.md),
and the affected canonical architecture before substantive changes.

- Follow the self-contained contribution rules in root CONTRIBUTING.md. Keep
  their adopted commit and branch conventions explicit in this repository.
  Other engineering standards and their provenance are indexed locally. Do not
  install retired central Golden Path tooling.
- Manage Stellar development and maintenance through GitHub Issues and the
  linked GitHub Project. Follow the [issue workflow](CONTRIBUTING.md#issue-management)
  and [work template](.github/ISSUE_TEMPLATE/work.md); keep issue bodies and Project
  status current, and link implementation and validation evidence.
- Write repository documentation, commits, issues, pull requests, comments and
  project updates in English. Preserve source text and the requested language of
  generated user reports; see the [language policy](CONTRIBUTING.md#working-language).
- Preserve the product boundary: the agent interprets and classifies source
  data; the bundled viewer owns styling, components, layout, and interaction.
- Classify by actual work purpose. Existing project names and tags are source
  metadata, not mandatory taxonomy. The prototype's categories are one dataset's
  result, not a fixed vocabulary for every user.
- Keep explicit source relations distinct from inferred associations. Shared
  classification or target membership alone does not establish a dependency.
- Do not claim the prototype has been imported, that a skill is callable, or
  that rendering works until executable evidence exists in this repository.
- Use root Just commands. `check` and `ci` are read-only quality gates; install,
  format, generation, release, and deployment are separate actions.
- Update affected canonical documentation with implementation. Promote Target
  claims to As-built only after checking their owning evidence.
- Keep local validation, hosted CI, visual review, publication, and runtime
  acceptance separate in handoffs.
- Treat development contracts as unreleased unless concrete consumer, release,
  or durable-state evidence establishes compatibility requirements. Preserve
  correctness identities and ordering invariants for their semantic purpose.
- Keep private snapshots and user reports outside tracked examples. Do not
  move or modify the original prototype or user backups as incidental cleanup.
