# ADR-0006: Distribute a Node-ready skill from GitHub

Status: **Accepted**

Date: 2026-09-18

## Context

Stellar's local authoring symlink depends on a prepared development checkout.
Users need a normal `npx skills add` installation that can produce reports
without mise, Just, pnpm or repository hooks. No Stellar release exists yet;
private saved states and reports already exist and remain untouched.

## Decision

Use MIT licensing and the existing public skills CLI to install the root skill
from GitHub. Keep canonical runner source, schemas, viewer and references in
their current locations. Commit a reproducible esbuild-generated Node.js 24
runner and complete dependency license notices. Installed instructions invoke
that runner directly; contributor Just commands continue to execute source.
CI compares generated files in memory and tests an isolated dependency-free copy.

Do not publish a separate Stellar npm package or create a custom installer. The
normal install tracks validated `main`; immutable tags identify releases and
exact-ref installations. Main promotion, tagging and published-tag verification
remain deliberate release actions, separate from implementation integration.
This refines the local-checkout distribution assumption in ADR-0004 without
changing its collection, classification or source-identity boundaries.

## Consequences

Contributors must regenerate the committed runner after source/dependency edits;
CI rejects drift. Users need Node 24, and the installer owns agent registration
and updates. The installation copies public repository files; it is not an
application server and performs no credential setup or source collection.
Private output remains outside the installed skill, and updates do not migrate
or rewrite stored user state. Installation success does not prove host discovery
or live source access.
