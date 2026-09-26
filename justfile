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
    mise exec --locked -- node scripts/docs/check-contract.ts --target .

# Regeneration is explicit and requires a reviewed local Archify installation.
diagrams-build:
    mise exec --locked -- node scripts/docs/diagrams.ts build

# Read-only hashes and exact HTML-to-SVG export comparison; no Archify required.
diagrams-check:
    mise exec --locked -- node scripts/docs/diagrams.ts check

# Read-only source and repository checks.
lint:
    mise exec --locked -- bash scripts/check.sh
    mise exec --locked -- corepack pnpm lint

format:
    mise exec --locked -- corepack pnpm format

format-check:
    mise exec --locked -- corepack pnpm format-check

# Explicit generation is separate from read-only checking.
types-build:
    mise exec --locked -- corepack pnpm types-build

types-check:
    mise exec --locked -- corepack pnpm types-check

typecheck:
    mise exec --locked -- corepack pnpm typecheck

test:
    mise exec --locked -- corepack pnpm test

# Browser installation is explicit and is never a side effect of a check.
browser-install:
    mise exec --locked -- corepack pnpm browser-install

browser-check:
    mise exec --locked -- corepack pnpm test:browser

# Installed-skill diagnostics and usage, using canonical source in a checkout.
version:
    mise exec --locked -- node bin/stellar.ts --version

doctor format="":
    mise exec --locked -- node bin/stellar.ts doctor {{ if format == "" { "" } else { quote(format) } }}

help command="":
    mise exec --locked -- node bin/stellar.ts help {{ if command == "" { "" } else { quote(command) } }}

validate input:
    mise exec --locked -- node bin/stellar.ts validate {{ quote(input) }}

# Read-only capture/map/HTML consistency; saved state is optional.
verify-run capture map html state="":
    mise exec --locked -- node bin/stellar.ts verify-run {{ quote(capture) }} {{ quote(map) }} {{ quote(html) }} {{ if state == "" { "" } else { quote(state) } }}

normalize input output:
    mise exec --locked -- node bin/stellar.ts normalize {{ quote(input) }} {{ quote(output) }}

# Retain a host-provided response file without printing its content.
retain-response input output:
    mise exec --locked -- node bin/stellar.ts retain-response {{ quote(input) }} {{ quote(output) }}

# Empty issue selects the issue index; offsets page through that index or a body.
inspect input issue="" offset="0":
    mise exec --locked -- node bin/stellar.ts inspect {{ quote(input) }} {{ quote(issue) }} {{ quote(offset) }}

# Read an exact source block in bounded chunks.
read-issue input issue block offset="0":
    mise exec --locked -- node bin/stellar.ts read-issue {{ quote(input) }} {{ quote(issue) }} {{ quote(block) }} {{ quote(offset) }}

# Locate literal source text across the body, returning paginated matches.
search-issue input issue query offset="0":
    mise exec --locked -- node bin/stellar.ts search-issue {{ quote(input) }} {{ quote(issue) }} {{ quote(query) }} {{ quote(offset) }}

# Continuity commands write a new private run directory and never replace one.
classify-draft draft choices run:
    mise exec --locked -- node bin/stellar.ts classify-draft {{ quote(draft) }} {{ quote(choices) }} {{ quote(run) }}

remember input run:
    mise exec --locked -- node bin/stellar.ts remember {{ quote(input) }} {{ quote(run) }}

refresh state capture run:
    mise exec --locked -- node bin/stellar.ts refresh {{ quote(state) }} {{ quote(capture) }} {{ quote(run) }}

classify state choices run:
    mise exec --locked -- node bin/stellar.ts classify {{ quote(state) }} {{ quote(choices) }} {{ quote(run) }}

revise state choices run:
    mise exec --locked -- node bin/stellar.ts revise {{ quote(state) }} {{ quote(choices) }} {{ quote(run) }}

render input output:
    mise exec --locked -- node bin/stellar.ts render {{ quote(input) }} {{ quote(output) }}

# Generate browser assets explicitly; drift checks never write.
build-viewer:
    mise exec --locked -- node scripts/build-viewer.ts

viewer-check:
    mise exec --locked -- node scripts/build-viewer.ts --check

# Regenerate the committed installed runner and dependency notices explicitly.
build-runner: build-viewer
    mise exec --locked -- node scripts/build-runner.ts

# Compare in memory; never rewrite the installed artifact from a quality gate.
bundle-check: viewer-check
    mise exec --locked -- node scripts/build-runner.ts --check

# Optional synthetic CLI measurements (macOS/Linux, system time); fresh output.
benchmark output reference="" sizes="1000,10000,50000" trials="3": bundle-check
    mise exec --locked -- node scripts/bench/benchmark.ts --node "$(mise exec --locked -- node -p process.execPath)" --output {{ quote(output) }} {{ if reference == "" { "" } else { "--reference " + quote(reference) } }} --sizes {{ quote(sizes) }} --trials {{ quote(trials) }}

# Exercise benchmark tooling without imposing timing limits.
benchmark-test: bundle-check
    mise exec --locked -- node --test scripts/bench/test_reference.ts

# CPU/allocation attribution on retained synthetic benchmark artifacts; not timings.
profile benchmark output trials="3": bundle-check
    mise exec --locked -- node scripts/bench/profile.ts --node "$(mise exec --locked -- node -p process.execPath)" --benchmark {{ quote(benchmark) }} --output {{ quote(output) }} --trials {{ quote(trials) }}

# Deterministic attribution arithmetic; also run separately in hosted CI.
profile-test:
    mise exec --locked -- node --test scripts/bench/test_profile.ts

# Browser QA is a separate gate.
check: docs-check diagrams-check format-check types-check typecheck lint bundle-check test

ci: check

# Link this checkout for user-level Codex discovery; never replace another skill.
skill-link:
    mise exec --locked -- node scripts/link-skill.ts

# Optional local Go/Rust experiment; compilers are explicit prerequisites.
native-build output: bundle-check
    bash scripts/bench/native/build.sh {{ quote(output) }}

native-compare build benchmark output trials="5":
    python3 scripts/bench/native/compare.py --node "$(mise exec --locked -- node -p process.execPath)" --build {{ quote(build) }} --benchmark {{ quote(benchmark) }} --output {{ quote(output) }} --trials {{ quote(trials) }}

# Optional frozen standalone experiment; no native dependency in product CI.
standalone-check:
    python3 -B scripts/bench/standalone/check_archive.py

standalone-test:
    python3 -B scripts/bench/standalone/test_checks.py

standalone-replay output sizes="1000,10000,50000" trials="5": bundle-check
    python3 -B scripts/bench/standalone/replay.py --node "$(mise exec --locked -- node -p process.execPath)" --output {{ quote(output) }} --sizes {{ quote(sizes) }} --trials {{ quote(trials) }}
