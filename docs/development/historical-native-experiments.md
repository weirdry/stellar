# Historical native experiments

The completed hybrid and standalone Go/Rust experiments are retained in Git
history. Their prototypes, fixtures, build/replay scripts and five Just recipes
have been removed from the current source tree. Current contributors use the
TypeScript [benchmark and profiling tools](performance.md).

The [hybrid study](../validation/2026-09-20-native-normalize-comparison.md),
[standalone study](../validation/2026-09-21-standalone-normalize-comparison.md)
and their retained datasets remain in this checkout. Measurements, source hashes,
known mismatches and the decision to retain Node, exclude Go and defer Rust
are unchanged. Historical records describe checks at their recorded revisions;
they do not advertise commands available in the current checkout.

## Source and replay checkout

Use the fixed pre-TypeScript revision
`0fe3abb5bf044812bc63a6519fe188e7c5fefbee`, which is reachable from released
history and contains both experiment bundles. Keep this separate from the
current checkout and use its own frozen dependencies:

```sh
git clone https://github.com/weirdry/stellar.git stellar-native-history &&
  cd stellar-native-history &&
  git checkout --detach 0fe3abb5bf044812bc63a6519fe188e7c5fefbee &&
  just init
```

Choose an absent clone destination. The clone needs full history: standalone
replay extracts product baseline `77ee2b9ba2d62f6523f0f0272ca714b1b920fa3b`.
Do not copy the old tools into the current tree or use current TypeScript
benchmark output or dependencies as historical inputs.

- The [hybrid procedure](https://github.com/weirdry/stellar/blob/0fe3abb5bf044812bc63a6519fe188e7c5fefbee/scripts/bench/native/README.md)
  owns native compiler prerequisites, staging, baseline generation and comparison.
  Run its `just benchmark`, `just native-build` and `just native-compare`
  commands only in the historical checkout. Staging patches the old JavaScript
  core; it cannot stage the current TypeScript source.
- The [standalone procedure](https://github.com/weirdry/stellar/blob/0fe3abb5bf044812bc63a6519fe188e7c5fefbee/scripts/bench/standalone/README.md)
  owns macOS/toolchain prerequisites and replay. In that checkout,
  `just standalone-check` validates retained source/lock and data hashes,
  `just standalone-test` exercises archive guards, and
  `just standalone-replay FRESH_OUTPUT` rebuilds and measures the experiment.
  These commands are absent from the current Justfile.

Use fresh output directories for each replay. Historical dependencies and
compilers must still be obtainable; retaining source does not guarantee future
tool availability or identical timing and binary hashes. No new native replay,
performance claim, native migration or installation acceptance is implied by
this cleanup. The [cleanup record](../validation/2026-09-27-native-experiment-retirement.md)
identifies the retention checks performed.
