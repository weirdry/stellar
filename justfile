set shell := ["bash", "-euo", "pipefail", "-c"]

# Project commands must not install tools declared only in a user-global config.
export MISE_IGNORED_CONFIG_PATHS := env("MISE_GLOBAL_CONFIG_FILE", env("XDG_CONFIG_HOME", env("HOME") / ".config") / "mise/config.toml")
export npm_config_userconfig := "/dev/null"

default:
    @just --list

# Install locked development tools and enable repository-managed Git hooks.
init:
    bash scripts/init.sh

# Validate the canonical documentation structure, states, indexes, and links.
docs-check:
    bash scripts/docs/check-contract.sh --target .

# Read-only JavaScript and repository checks.
lint:
    mise exec --locked -- bash scripts/check.sh
    mise exec --locked -- corepack pnpm lint

format:
    mise exec --locked -- corepack pnpm format

format-check:
    mise exec --locked -- corepack pnpm format-check

test:
    mise exec --locked -- corepack pnpm test

# Browser installation is explicit and is never a side effect of a check.
browser-install:
    mise exec --locked -- corepack pnpm browser-install

browser-check:
    mise exec --locked -- corepack pnpm test:browser

validate input:
    mise exec --locked -- node bin/stellar.js validate {{ quote(input) }}

# Read-only capture/map/HTML consistency; saved state is optional.
verify-run capture map html state="":
    mise exec --locked -- node bin/stellar.js verify-run {{ quote(capture) }} {{ quote(map) }} {{ quote(html) }} {{ if state == "" { "" } else { quote(state) } }}

normalize input output:
    mise exec --locked -- node bin/stellar.js normalize {{ quote(input) }} {{ quote(output) }}

# Continuity commands write a new private run directory and never replace one.
remember input run:
    mise exec --locked -- node bin/stellar.js remember {{ quote(input) }} {{ quote(run) }}

refresh state capture run:
    mise exec --locked -- node bin/stellar.js refresh {{ quote(state) }} {{ quote(capture) }} {{ quote(run) }}

classify state choices run:
    mise exec --locked -- node bin/stellar.js classify {{ quote(state) }} {{ quote(choices) }} {{ quote(run) }}

revise state choices run:
    mise exec --locked -- node bin/stellar.js revise {{ quote(state) }} {{ quote(choices) }} {{ quote(run) }}

render input output:
    mise exec --locked -- node bin/stellar.js render {{ quote(input) }} {{ quote(output) }}

# No compiled bundle or published package exists. Browser QA is a separate gate.
check: docs-check format-check lint test

ci: check

# Link this checkout for user-level Codex discovery; never replace another skill.
skill-link:
    mise exec --locked -- node scripts/link-skill.js
