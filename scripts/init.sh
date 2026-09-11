#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export MISE_IGNORED_CONFIG_PATHS="${MISE_GLOBAL_CONFIG_FILE:-${XDG_CONFIG_HOME:-$HOME/.config}/mise/config.toml}"

before="$(git hash-object mise.toml mise.lock)"
mise install --locked
after="$(git hash-object mise.toml mise.lock)"
if [[ "$before" != "$after" ]]; then
    echo 'error: tool installation changed the committed selectors or lock' >&2
    exit 1
fi

git config --local core.hooksPath .githooks
printf 'Stellar development tools and repository hooks are ready.\n'
