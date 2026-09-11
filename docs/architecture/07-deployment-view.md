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
There is no published skill package, deployed service, or runtime data store.
See [development](../development/README.md).

## Intended distribution

State: **Target**

A host agent will use an installed skill package containing its guidance and
viewer/tooling resources. Generated HTML will be opened in a local browser.
The exact package layout, installer, license, and distribution channel remain
Open until a functioning vertical path is ready for packaging.

`dev` accumulates unreleased work; validated fast-forward promotion to `main`
is the intended release boundary. Add release automation only after identifying
the actual distributed artifact and its validation. No development deployment
or mixed-version runtime overlap is assumed.

User inputs and saved reports belong to the user. Repository refactoring or a
future artifact update must not reset or migrate those files as incidental work.
