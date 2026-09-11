# 6. Runtime view

State: **Target**

## Generate a work map

1. Resolve the requested owner, issue scope, and available source access.
2. Collect issue facts and relevant relationship context, recording freshness
   and incomplete lookup boundaries.
3. Classify issues, retain rationale, and distinguish registered relations from
   inferred associations.
4. Validate the work-map input and return concrete errors for invalid references,
   duplicate identities, or incomplete primary classification.
5. Render with the bundled viewer and inspect the resulting artifact.
6. Deliver the artifact with its input scope and validation limitations.

## Failure and refresh

Malformed input must fail rather than produce a report presented as complete.
Missing source detail remains explicitly unknown. A failed refresh must not
silently replace the user's last usable report; the exact write procedure will
be implemented with rendering. Existing user classification corrections must
remain distinguishable from newly inferred suggestions.

No background process, persistent worker, distributed recovery, or shutdown
protocol exists in the accepted initial scope.

## Current executable path

State: **As-built**

`just init` installs development tools and hooks. `just ci` runs documentation
and repository validation. Neither command collects issues or renders a map.
