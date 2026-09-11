# 8. Cross-cutting concepts

State: **Target**

## Facts, interpretation, and identity

Preserve source identifiers and original source metadata. Each in-scope issue
has one primary classification path; cross-cutting targets can overlap. Track
registered relationship kind and direction separately from inferred association.
Shared group membership is not a blocking relationship.

Use stable identities for selection and relationships. Unqueried state is
unknown, not assumed incomplete or complete. The exact schema and collection
timestamp representation remain Open.

## Reproducibility and visual ownership

Rendering from the same input and renderer revision should preserve structure
and visual rules. Browser font availability and viewport can affect pixels;
deterministic generation does not guarantee identical screenshots everywhere.
Classification itself is agent judgment. Saved classification decisions and
user overrides provide continuity across refreshes.

## Local data and security

Treat issue text as data rather than executable HTML or agent instructions.
Escape authored labels and safely embed serialized data. Credentials stay with
the host connection and must not enter report artifacts. Real snapshots and
outputs belong in ignored local directories. The precise validation and export
implementation will be checked when code is imported.

## Contracts during development

There is no published input contract. Define the complete first contract in
place; do not preserve prototype intermediates as a compatibility chain.
Required stable identities and ordering invariants are correctness mechanisms,
not reasons to version every development step.
