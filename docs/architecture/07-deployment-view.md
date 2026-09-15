# 7. Deployment view

State: **As-built**

Source is hosted in the public [weirdry/stellar repository](https://github.com/weirdry/stellar).
`dev` is the integration branch; `main` is the default branch and validated
baseline. The repository enables rebase merge and disables merge-commit and
squash integration.

The [workflow](../../.github/workflows/ci.yml) runs the repository-owned gate on
pushes to `dev` and `main`, and PRs targeting `dev`. Actual results are available
in [GitHub Actions](https://github.com/weirdry/stellar/actions/workflows/ci.yml);
workflow configuration is not proof of a successful run or merge enforcement.
There is no published skill package, deployed service, or server-side data store.
Local private state files support requested refreshes; each operation creates a
new run and leaves earlier states and reports intact.
See [development](../development/README.md).

## Local skill use

State: **As-built**

After locked checkout setup, `just skill-link` creates a user-level `stellar`
skill symlink to this checkout. Existing different installations are not replaced.
The checkout, Node runtime and installed dependencies must remain available. The
skill resolves bundled resources relative to its root; it can render artifacts
outside the checkout. Discovery/caching belongs to the host. Local invocation
and fixture/live evidence are recorded in [validation](../validation/2026-09-12-source-aware-skill.md).

The agent selects the output base from the current user request, then an output
location already established in the conversation. Otherwise it uses
`~/Documents/Stellar/` in the execution user's home, independent of task and
installation directories. It resolves paths before invoking the CLI and uses
a fresh run directory for each generation or refresh. CLI output arguments
remain required; existing reports and states are not relocated. The
[run guide](../../references/runs.md#choose-the-run-location) owns the workflow.
The [output-location validation record](../validation/2026-09-15-output-location.md)
records the explicit synthetic invocation and its limits.

## Intended distribution

State: **Target**

A distributable package/channel, license and release automation remain Open.
A local development symlink is not a published artifact.

`dev` accumulates unreleased work; validated fast-forward promotion to `main`
is the intended release boundary. Add release automation only after identifying
the actual distributed artifact and its validation. No development deployment
or mixed-version runtime overlap is assumed.

User inputs and saved reports belong to the user. Repository refactoring or a
future artifact update must not reset or migrate those files as incidental work.
