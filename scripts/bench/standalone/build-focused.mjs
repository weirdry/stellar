// Resolve dependencies from the prepared baseline, without a host-specific path.
import { build } from './baseline/node_modules/esbuild/lib/main.js';
import { cp } from 'node:fs/promises';
await build({
  entryPoints: ['focused-entry.mjs'],
  outfile: 'bin/node-focused.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
});
await cp('baseline/schemas', 'schemas', { recursive: true });
