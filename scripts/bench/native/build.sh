#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
if [[ $# != 1 ]]; then
    printf 'Usage: just native-build FRESH_OUTPUT\n' >&2
    exit 2
fi
mkdir "$1"
probe_root=$(cd "$1" && pwd)
export GOTOOLCHAIN=local
export GOCACHE="$probe_root/go-cache"
export CARGO_HOME="$probe_root/cargo-home"
export CARGO_TARGET_DIR="$probe_root/rust-target"
go version > "$probe_root/go-version.txt"
rustc --version > "$probe_root/rust-version.txt"
cargo --version > "$probe_root/cargo-version.txt"
(cd scripts/bench/native/go && go build -trimpath -o "$probe_root/go-worker" .)
cargo build --release --locked --manifest-path scripts/bench/native/rust/Cargo.toml
cp "$CARGO_TARGET_DIR/release/stellar-normalize-probe" "$probe_root/rust-worker"
mise exec --locked -- node scripts/bench/native/stage.mjs "$probe_root/stage"
