#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

just --fmt --check

while IFS= read -r -d '' script; do
    bash -n "$script"
    shellcheck --shell=bash "$script"
done < <(find scripts .githooks -type f \( -name '*.sh' -o -name pre-commit -o -name commit-msg \) -print0)

actionlint
git diff --check
git diff --cached --check
printf 'Repository syntax, shell, workflow, and whitespace checks: OK\n'
