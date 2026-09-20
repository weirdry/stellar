# Native normalization experiment

State: **As-built** experimental tooling; not part of the installed Stellar skill.

This compares the complete `normalize CAPTURE OUTPUT` invocation of the committed
Node runner with an experimental Node runner using a short-lived Go or Rust
worker. It is **not** a standalone native CLI implementation or a language ranking.
The product remains JavaScript, and no runtime dependency or package is changed.

## Exact boundary

The experimental bundle uses the same full CLI entry point and esbuild options.
A checked source insertion point in `stage.mjs` adds an alternate branch after
capture/schema validation, shared source validation, native-record checks,
relationship collection and GitHub URL/repository resolution. Those operations
remain in Node. Go and Rust receive prepared records over JSON stdin and perform:

- Source-qualified alias binding and identity resolution.
- Full and unqueried context issue construction, including native metadata and
  status translation, deterministic UTF-16 context selection and array ordering.
- Directed relation construction and undirected related-edge deduplication.

Node parses the response, runs the canonical final work-map validator, serializes
the draft, and uses the existing atomic writer and input-alias protection. The
measurement includes all Node/worker startup, input parsing, preparation, JSON
transfer, native work, final validation, writing and exit. The original Node
implementation remains available inside the experimental bundle for diagnostics
and declined inputs. Its code is not executed on a successful native trial.

Worker rejection, malformed output or failed final validation goes through the
original JavaScript implementation to retain exact capture-origin diagnostics.
Lone-surrogate escapes and non-string truthy GitHub status reasons also fall back;
this probe deliberately does not port all JavaScript coercion semantics. A
receipt identifies successful native execution versus fallback. The harness
rejects **every timed native result** that fell back, even if its output matches.
The differential corpus records fallback and pre-worker rejection separately.
Passing finite examples does not establish arbitrary-input replacement safety:
a schema-valid, factually incorrect worker response can evade final validation,
so independent output parity is essential. These probes must not be installed.

`probe-node` is the experimental bundle with the worker disabled. It controls for
bundle/instrumentation changes separately from the committed Node baseline.
The final validator and the existing balanced hierarchy algorithm are unchanged;
there is no parallel graph algorithm or omitted validation credited as a speedup.

## Reproduce

Requires the repository's `just init` setup, Python 3.11+, Go and Cargo/Rust on
PATH, network access for a fresh locked Cargo download, and permission to run
`ps` for read-only PID/PPID/RSS sampling. It does not install compilers globally.
The recorded run used Go 1.26.8 and Rust/Cargo 1.96.0 on macOS arm64. No Windows
support is claimed. All paths below must be fresh, and their parent must exist.
The stager checks that its normalizer insertion anchor occurs exactly once
before creating the stage directory or copying resources. A missing or repeated
anchor leaves the requested stage path absent. This does not promise cleanup of
the outer native-build directory or failures later in staging.

```sh
just init
just benchmark /tmp/stellar-native-baseline
just native-build /tmp/stellar-native-build
just native-compare /tmp/stellar-native-build /tmp/stellar-native-baseline /tmp/stellar-native-results
```

`native-build` checks product bundle currency, builds Go with default optimization
and `-trimpath`, and builds Rust with `--release --locked`, LTO and one codegen
unit. Cargo's release profile uses optimization level 3; see the
[Cargo profile reference](https://doc.rust-lang.org/cargo/reference/profiles.html).
Go uses its standard `encoding/json`; Rust uses locked `serde_json` with
`preserve_order` and `base64`. Their generic JSON representations and allocation
strategies are prototypes, not equally tuned or idiomatic performance ceilings.
Build caches and binaries stay in the requested output directory. The checked-in
Cargo lock records dependency resolution; no native dependency enters `package.json`
or the product bundle. Go uses the installed local toolchain and refuses an
older toolchain instead of downloading one implicitly.

`native-compare BUILD BENCHMARK OUTPUT [TRIALS]` defaults to five trials, uses
retained synthetic benchmark captures, and verifies runtime, fixture and artifact
hashes before execution. Build-source drift is rejected. The ordinary Node
runner, experimental bundle, worker binaries and inputs are fingerprinted in
`results.json`. Build/preparation time is outside execution samples.

The comparison first runs the unchanged canonical normalization tests against
isolated copies of the experimental modules and CLI. In Go/Rust modes, this suite
mixes native execution, JavaScript fallback and pre-worker rejection; it checks
normalization behavior, not a native-success receipt for each assertion. Actual
native execution is required separately for designated differential cases and
every timed native result. The comparison then checks exit code, stdout, stderr
and output bytes against the committed CLI on a separate synthetic
corpus, including existing-output sentinels on failure. Source/identity collisions,
late aliases, Unicode ordering, malformed inputs and metadata are included.
Every timed output also matches the retained baseline draft SHA-256. Generated
inputs, raw logs, binaries and previous outputs remain local.

After one untimed warm-up for each size/engine, fresh processes execute serially
in deterministic shuffled order. Wall time and POSIX CPU include startup and
transfer costs. `wait4` CPU includes waited-for descendants; its RSS field is
retained as a platform diagnostic, **not** treated as aggregate memory of a
multi-process pipeline. One separate memory execution per size/engine samples
simultaneous RSS across the process tree using `ps`, with a 20 ms sleep plus
sampling duration. That result is a sampled lower bound, can count shared pages
more than once, and is neither exact peak physical memory nor retained heap.
Memory sampling perturbs execution and its wall time is excluded from results.

The harness has no CI timing threshold. The current default quality gate does
not acquire Go, Rust or Python dependencies. Review its recorded parity and
compiler results separately from `just ci`, hosted browser tests, installation,
live source access and release acceptance.
