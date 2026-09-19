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

# Regeneration is explicit and requires a reviewed local Archify installation.
diagrams-build:
    mise exec --locked -- node scripts/docs/diagrams.mjs build

# Read-only hashes and exact HTML-to-SVG export comparison; no Archify required.
diagrams-check:
    mise exec --locked -- node scripts/docs/diagrams.mjs check

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

# Installed-skill diagnostics and usage, using canonical source in a checkout.
version:
    mise exec --locked -- node bin/stellar.js --version

doctor format="":
    mise exec --locked -- node bin/stellar.js doctor {{ if format == "" { "" } else { quote(format) } }}

help command="":
    mise exec --locked -- node bin/stellar.js help {{ if command == "" { "" } else { quote(command) } }}

validate input:
    mise exec --locked -- node bin/stellar.js validate {{ quote(input) }}

# Read-only capture/map/HTML consistency; saved state is optional.
verify-run capture map html state="":
    mise exec --locked -- node bin/stellar.js verify-run {{ quote(capture) }} {{ quote(map) }} {{ quote(html) }} {{ if state == "" { "" } else { quote(state) } }}

normalize input output:
    mise exec --locked -- node bin/stellar.js normalize {{ quote(input) }} {{ quote(output) }}

# Retain a host-provided response file without printing its content.
retain-response input output:
    mise exec --locked -- node bin/stellar.js retain-response {{ quote(input) }} {{ quote(output) }}

# Empty issue selects the issue index; offsets page through that index or a body.
inspect input issue="" offset="0":
    mise exec --locked -- node bin/stellar.js inspect {{ quote(input) }} {{ quote(issue) }} {{ quote(offset) }}

# Read an exact source block in bounded chunks.
read-issue input issue block offset="0":
    mise exec --locked -- node bin/stellar.js read-issue {{ quote(input) }} {{ quote(issue) }} {{ quote(block) }} {{ quote(offset) }}

# Locate literal source text across the body, returning paginated matches.
search-issue input issue query offset="0":
    mise exec --locked -- node bin/stellar.js search-issue {{ quote(input) }} {{ quote(issue) }} {{ quote(query) }} {{ quote(offset) }}

# Continuity commands write a new private run directory and never replace one.
classify-draft draft choices run:
    mise exec --locked -- node bin/stellar.js classify-draft {{ quote(draft) }} {{ quote(choices) }} {{ quote(run) }}

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

# Regenerate the committed installed runner and dependency notices explicitly.
build-runner:
    mise exec --locked -- node scripts/build-runner.js

# Compare in memory; never rewrite the installed artifact from a quality gate.
bundle-check:
    mise exec --locked -- node scripts/build-runner.js --check

# Optional synthetic CLI measurements (macOS/Linux, Python 3.11+); fresh output.
benchmark output reference="" sizes="1000,10000,50000" trials="3": bundle-check
    python3 scripts/bench/benchmark.py --node "$(mise exec --locked -- node -p process.execPath)" --output {{ quote(output) }} {{ if reference == "" { "" } else { "--reference " + quote(reference) } }} --sizes {{ quote(sizes) }} --trials {{ quote(trials) }}

# Exercise optional benchmark tooling without imposing timing limits on CI.
benchmark-test: bundle-check
    python3 scripts/bench/test_reference.py --node "$(mise exec --locked -- node -p process.execPath)"

# Browser QA is a separate gate.
check: docs-check diagrams-check format-check lint bundle-check test

ci: check

# Link this checkout for user-level Codex discovery; never replace another skill.
skill-link:
    mise exec --locked -- node scripts/link-skill.js
