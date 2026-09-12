# 5. Building-block view

State: **As-built**

| Building block      | Owns                                                                                                         | Evidence                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| CLI                 | Argument handling, native normalization, validation diagnostics, render invocation                           | [bin/stellar.js](../../bin/stellar.js)                                                                                          |
| Work-map schema     | Report, issue, classification, relation and reference shape                                                  | [schemas](../../schemas/README.md)                                                                                              |
| Validator           | Unique identities, references, primary classification, source-parent and URL invariants                      | [validate.js](../../lib/validate.js)                                                                                            |
| Renderer            | Locale selection, owner-derived branding, safe HTML embedding and preservation of previous output on failure | [render.js](../../lib/render.js)                                                                                                |
| Viewer              | Styling, SVG components, layout, navigation, inspector and export                                            | [assets/viewer](../../assets/viewer/README.md)                                                                                  |
| Locale catalogs     | Bundled Korean and English fixed UI text and naming patterns                                                 | [Korean](../../assets/viewer/locales/ko.json), [English](../../assets/viewer/locales/en.json)                                   |
| Examples and tests  | Public reuse and behavior evidence using invented data                                                       | [examples](../../examples/README.md), [core tests](../../test/core.test.js), [browser tests](../../test/browser/viewer.test.js) |
| Development tooling | Locked native dependencies, Just gates, hooks and CI caller                                                  | [development](../development/README.md)                                                                                         |

The single native root is the repository's Node package. The viewer is bundled
source, not an independently deployed service. No L1 boundary or multi-package
workspace is necessary for these directories.

## Agent workflow

State: **As-built**

[SKILL.md](../../SKILL.md) owns common collection, classification, repair and
handoff guidance. Source-specific references define host retrieval and capture
boundaries. [normalize.js](../../lib/normalize.js) translates native facts into
one canonical work-map draft; [classification guidance](../../references/classification.md)
keeps judgment with the agent. [continuity.js](../../lib/continuity.js) owns
saved choices, refresh matching and actor-specific updates; its state contains
a current work map plus private remembered interpretation. [link-skill.js](../../scripts/link-skill.js) safely
registers this checkout in the user's local discovery directory. It does not
publish a package or replace another installation.
