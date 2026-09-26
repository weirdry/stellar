# Development declaration correction

`@apidevtools/json-schema-ref-parser@11.9.3` is a transitive dependency of the
pinned JSON Schema declaration generator. Its published `getNewOptions` default
type expands optional properties to include explicit `undefined`; that default
does not satisfy its own `ParserOptions<S>` constraint with
`exactOptionalPropertyTypes: true`. Checking the actual generator imports exposed
this error under `skipLibCheck: false`.

The pnpm patch uses `ParserOptions<S>` itself as the default, retaining the
constraint, function arguments and return type. It changes only a declaration,
not executable dependency code. Remove the patch when an intentionally upgraded
generator/parser dependency passes the complete strict program without it.
`just init` applies the locked patch; `just typecheck` checks it, and
`test/types-tooling.test.ts` verifies deterministic declaration output and drift
detection. Compiler strictness stays enabled for all dependency declarations.
