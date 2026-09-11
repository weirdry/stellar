# 11. Risks and technical debt

State: **Open**

| Open item | Closure condition | Owner |
| --- | --- | --- |
| Prototype source has not been imported | Source-based generation reproduces the accepted viewer | Stellar maintainer |
| Input schema and runtime choice | Minimal real contract and native tooling are implemented together | Stellar maintainer |
| Classification drift on repeated runs | Previous decisions and explicit overrides have tested refresh rules | Stellar maintainer |
| Dense graphs, long labels, and viewport differences | Representative browser/visual review establishes supported behavior | Stellar maintainer |
| Source access and partial snapshots | Collection adapter reports scope, freshness, and incomplete evidence | Stellar maintainer |
| License and distribution | Maintainer chooses the actual artifact and verifies install/use | Stellar maintainer |
| Hosting enforcement and dependency security controls | Evaluate applicable branch rules and remediation routing with the actual dependency surface | Stellar maintainer |

The current foundation deliberately does not infer capacity targets, persistent
services, cross-repository contracts, or deployment overlap. Add mechanisms
when a real failure mode and final invariant justify them.

These open items are not additional release phases or separately required
tracking issues. Prioritize the first working generation path described in
[solution strategy](04-solution-strategy.md).
