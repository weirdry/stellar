# 5. Building-block view

State: **As-built**

| Building block      | Owns                                                                                    | Evidence                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| CLI                 | Argument handling, validation diagnostics, render invocation                            | [bin/stellar.js](../../bin/stellar.js)                                                                                          |
| Work-map schema     | Report, issue, classification, relation and reference shape                             | [schemas](../../schemas/README.md)                                                                                              |
| Validator           | Unique identities, references, primary classification, source-parent and URL invariants | [validate.js](../../lib/validate.js)                                                                                            |
| Renderer            | Safe HTML embedding and preservation of previous output on failure                      | [render.js](../../lib/render.js)                                                                                                |
| Viewer              | Styling, SVG components, layout, navigation, inspector and export                       | [assets/viewer](../../assets/viewer/README.md)                                                                                  |
| Examples and tests  | Public reuse and behavior evidence using invented data                                  | [examples](../../examples/README.md), [core tests](../../test/core.test.js), [browser tests](../../test/browser/viewer.test.js) |
| Development tooling | Locked native dependencies, Just gates, hooks and CI caller                             | [development](../development/README.md)                                                                                         |

The single native root is the repository's Node package. The viewer is bundled
source, not an independently deployed service. No L1 boundary or multi-package
workspace is necessary for these directories.

## Agent workflow

State: **Target**

A root skill entry point will own collection, authoring, and repair guidance.
[Classification guidance](../../references/classification.md) records the
purpose-based grouping boundary, but no installed/callable skill exists yet.
