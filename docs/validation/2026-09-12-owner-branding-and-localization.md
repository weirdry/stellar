# Owner branding and localization validation — 2026-09-12

State: **As-built**

Scope: owner-derived Stellar names and bundled Korean/English UI in the
unreleased rendering core. The [contract](../../schemas/README.md) and
[ADR-0003](../decisions/0003-bind-viewer-language-to-the-work-map.md) own the
language and naming boundary.

## Local checks

- `just ci`: documentation, formatting, lint, repository checks, and all nine
  Node unit/CLI tests passed. Both catalogs have matching keys and interpolation
  parameters. Missing/unsupported locale and arbitrary top-level titles fail
  validation. Embedded source issues remain unchanged.
- `STELLAR_QA_DIR=outputs/qa-locale just browser-check`: both Chromium suites
  passed, one per locale. Each report used the opposite browser language.
  Document/header/SVG names, controls, original source text, all example issue
  neighborhoods, relationship direction, counts, filtering, navigation, themes,
  six viewports, mobile drawers, literal input text, and offline opening passed.
- `just render examples/museum.json outputs/museum.html` and
  `just render examples/seed-library.json outputs/seed-library.html`: generated
  the Korean and English synthetic previews from the same bundled viewer.

## Visual review and private boundary

Reviewed synthetic Korean/English overview, English neighborhood in light mode,
English mobile overview, and the fully English seed-library view. Header names,
fixed labels, inspector wrapping, relationship captions, and mobile containment
were readable. Screenshots remain in ignored `outputs/qa-locale`.

A new ignored copy of the private regression input was given the supported
locale and rendered locally. Its issue and relation arrays were checked against
the prior private input without changes. The original prototype, user backup,
and prior input were retained. This additional render is not a repeat of the
original full private browser regression recorded in the rendering-core record.
Private data and all derived artifacts remain outside Git and public CI.

## Limits

Hosted CI is reported separately on the PR revision. These observations do not
establish released-package, installed-skill, or live source integration evidence.
The runner supports `ko` and `en`; it does not translate source facts, switch
language interactively, or validate the quality of future agent-authored prose.
Browser verification used Chromium, not every browser engine.
