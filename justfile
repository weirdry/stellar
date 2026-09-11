set shell := ["bash", "-euo", "pipefail", "-c"]

# Project commands must not install tools declared only in a user-global config.
export MISE_IGNORED_CONFIG_PATHS := env("MISE_GLOBAL_CONFIG_FILE", env("XDG_CONFIG_HOME", env("HOME") / ".config") / "mise/config.toml")

default:
    @just --list

# Install locked development tools and enable repository-managed Git hooks.
init:
    bash scripts/init.sh

# Validate the canonical documentation structure, states, indexes, and links.
docs-check:
    bash scripts/docs/check-contract.sh --target .

# Read-only syntax, formatting, shell, and workflow checks.
lint:
    mise exec --locked -- bash scripts/check.sh

# The complete local quality gate for the current repository foundation.
check: docs-check lint

# No product build exists yet; CI uses the same real validation path.
ci: check
