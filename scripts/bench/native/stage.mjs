// Build an isolated experimental CLI from the same full CLI entry and flags.
import { build } from 'esbuild';
import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(process.argv[2]);
const source = await readFile(join(root, 'lib/normalize.js'), 'utf8');
const anchor =
  '  // Index explicit native/identifier pairs before resolving identifier-only';
if (source.split(anchor).length !== 2)
  throw new Error('Normalizer insertion boundary moved');
await mkdir(output); // Fresh only.
await mkdir(join(output, 'bin'));
for (const name of ['schemas', 'assets'])
  await cp(join(root, name), join(output, name), { recursive: true });
for (const name of ['stellar.mjs', 'stellar.manifest.json'])
  await cp(join(root, 'bin', name), join(output, 'bin', name));
const injection = `
  if (process.env.STELLAR_NATIVE_WORKER) {
    try {
      const result = nativeProbe(records, capture.locale);
      const candidate = { ...map, issues: result.issues, relations: result.relations };
      if (validateWorkMap(candidate).diagnostics.some(d => d.code !== 'missing-classification'))
        throw new Error('native result rejected');
      probeReceipt('native');
      return candidate;
    } catch {
      probeReceipt('fallback');
      // Original code below owns exact capture-origin diagnostics and all fallbacks.
    }
  }
`;
const bridge = join(root, 'scripts/bench/native/bridge.mjs');
const options = {
  absWorkingDir: root,
  entryPoints: ['bin/stellar.js'],
  outfile: 'bin/probe.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  write: false,
  legalComments: 'inline',
  plugins: [
    {
      name: 'experimental-native-worker',
      setup(builder) {
        builder.onLoad({ filter: /[/\\]normalize\.js$/ }, ({ path }) => {
          if (path !== join(root, 'lib/normalize.js')) return;
          return {
            contents:
              `import {nativeProbe, probeReceipt} from ${JSON.stringify(bridge)};\n` +
              source.replace(anchor, injection + anchor),
            loader: 'js',
          };
        });
        builder.onLoad({ filter: /[/\\]package\.json$/ }, async ({ path }) => {
          if (path !== join(root, 'package.json')) return;
          const { version } = JSON.parse(await readFile(path, 'utf8'));
          return { contents: JSON.stringify({ version }), loader: 'json' };
        });
      },
    },
  ],
};
const result = await build(options);
await writeFile(join(output, 'bin/probe.mjs'), result.outputFiles[0].text);
// Reuse the canonical suite; bundle its module imports to remain cwd-independent.
await mkdir(join(output, 'lib'));
for (const name of ['normalize', 'validate']) {
  const api = await build({
    ...options,
    entryPoints: [`lib/${name}.js`],
    outfile: `lib/${name}.js`,
  });
  await writeFile(join(output, `lib/${name}.js`), api.outputFiles[0].text);
}
await cp(join(root, 'examples'), join(output, 'examples'), { recursive: true });
await mkdir(join(output, 'test'));
for (const name of ['normalize.test.js', 'fixtures.js'])
  await cp(join(root, 'test', name), join(output, 'test', name));
await cp(join(root, 'package.json'), join(output, 'package.json'));
// The canonical CLI test invokes bin/stellar.js; use the probe in this isolated copy.
await writeFile(join(output, 'bin/stellar.js'), result.outputFiles[0].text);
const names = [
  'lib/normalize.js',
  'lib/validate.js',
  'scripts/bench/native/stage.mjs',
  'scripts/bench/native/bridge.mjs',
  'scripts/bench/native/build.sh',
  'scripts/bench/native/go/main.go',
  'scripts/bench/native/go/go.mod',
  'scripts/bench/native/rust/src/main.rs',
  'scripts/bench/native/rust/Cargo.toml',
  'scripts/bench/native/rust/Cargo.lock',
];
const hashes = {};
for (const name of names)
  hashes[name] = createHash('sha256')
    .update(await readFile(join(root, name)))
    .digest('hex');
await writeFile(
  join(output, 'build-sources.json'),
  JSON.stringify(hashes, null, 2) + '\n',
);
