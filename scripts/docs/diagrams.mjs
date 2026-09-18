import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const directory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/architecture/diagrams',
);
const manifestPath = join(directory, 'manifest.json');
const mode = process.argv[2] ?? 'check';
const digest = (value) => createHash('sha256').update(value).digest('hex');
const read = (name) => readFileSync(join(directory, name), 'utf8');
const systemTheme =
  "window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'";
const defaultTheme = "'dark' /* Stellar documentation default */";
const expectedGenerator = 'archify 2.17.0-dev.1';
const systemChange = "apply(e.matches ? 'light' : 'dark');";
const retainTheme =
  'return; /* Stellar theme changes require an explicit choice */';

// Preserve explicit choices and keep the dark default through live OS changes.
function setDefaultTheme(html) {
  if (html.split(systemTheme).length !== 3)
    throw new Error(
      'Expected two Archify theme fallbacks; review the theme adapter.',
    );
  if (html.split(systemChange).length !== 2)
    throw new Error(
      'Expected one Archify OS theme listener; review the adapter.',
    );
  return html
    .replaceAll(systemTheme, defaultTheme)
    .replace(systemChange, retainTheme);
}

function generatorHtml(html) {
  if (html.split(defaultTheme).length !== 3)
    throw new Error('Expected the Stellar dark-theme adapter.');
  if (html.split(retainTheme).length !== 2)
    throw new Error('Expected the Stellar OS-theme adapter.');
  return html
    .replaceAll(defaultTheme, systemTheme)
    .replace(retainTheme, systemChange);
}

// Export the exact delivered SVG and stylesheet without redrawing it.
function exportSvg(html) {
  const svgs = [...html.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/g)];
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)];
  if (svgs.length !== 1 || styles.length !== 1) {
    throw new Error(
      'Expected one SVG and one stylesheet; review the exporter after an Archify change.',
    );
  }
  const themeBlocks = [
    styles[0][1].match(/:root,\s*\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1],
  ];
  if (themeBlocks.some((block) => !block))
    throw new Error('Missing exported theme declarations.');
  const colors = Object.fromEntries(
    themeBlocks.flatMap((block) =>
      [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
        match[1],
        match[2].trim(),
      ]),
    ),
  );
  const resolveColors = (text) =>
    text.replace(/var\((--[\w-]+)\)/g, (match, name) => colors[name] ?? match);
  const svg = resolveColors(svgs[0][0]);
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!viewBox) throw new Error('Missing finite SVG viewBox.');
  const [, width, height] = viewBox;
  const css = resolveColors(styles[0][1].trimEnd());
  if (css.includes(']]>'))
    throw new Error('Unsupported stylesheet CDATA terminator.');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    svg.replace(
      /<svg\b([^>]*)>/,
      `<svg xmlns="http://www.w3.org/2000/svg" data-theme="dark" width="${width}" height="${height}"$1>\n` +
        `<style><![CDATA[${css}\nsvg { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }\n]]></style>\n` +
        `<rect width="${width}" height="${height}" fill="${colors['--bg']}"/>`,
    ) +
    '\n'
  );
}

function inspect(name) {
  const source = read(`${name}.json`);
  const html = read(`${name}.html`);
  const specification = JSON.parse(source);
  const generator = html.match(/<meta name="generator" content="([^"]+)"/)?.[1];
  if (
    specification.meta?.quality_profile !== 'showcase' ||
    generator !== expectedGenerator
  ) {
    throw new Error(
      `${name}: expected showcase source and ${expectedGenerator} delivery.`,
    );
  }
  const svg = exportSvg(html);
  return {
    svg,
    record: {
      name,
      type: specification.diagram_type,
      generator,
      sourceSha256: digest(source),
      generatedHtmlSha256: digest(generatorHtml(html)),
      htmlSha256: digest(html),
      htmlBytes: Buffer.byteLength(html),
      svgSha256: digest(svg),
    },
  };
}

try {
  if (!['build', 'check'].includes(mode))
    throw new Error('Usage: diagrams.mjs [build|check]');
  const sources = readdirSync(directory).filter(
    (name) =>
      name.endsWith('.json') &&
      name !== 'manifest.json' &&
      !name.endsWith('.visual-check.json'),
  );
  const invalidNames = sources.filter(
    (name) => !/^[a-z][a-z0-9_-]*\.json$/.test(name),
  );
  if (invalidNames.length)
    throw new Error(
      `Unsupported diagram source names: ${invalidNames.sort().join(', ')}. Use lowercase letters, digits, underscores or hyphens, starting with a letter.`,
    );
  const names = sources.map((name) => name.slice(0, -5)).sort();
  if (names.length === 0) throw new Error('No diagram sources found.');
  if (mode === 'build') {
    if (!process.env.ARCHIFY_ROOT)
      throw new Error('Set ARCHIFY_ROOT to the reviewed Archify installation.');
    const cli = join(process.env.ARCHIFY_ROOT, 'bin/archify.mjs');
    for (const name of names) {
      const type = JSON.parse(read(`${name}.json`)).diagram_type;
      const result = JSON.parse(
        execFileSync(
          process.execPath,
          [
            cli,
            'deliver',
            type,
            join(directory, `${name}.json`),
            join(directory, `${name}.html`),
            '--quality',
            'showcase',
            '--json',
          ],
          { encoding: 'utf8' },
        ),
      );
      const validation = result.validation;
      if (
        !result.ok ||
        validation?.checksPassed !== 9 ||
        validation.checkCount !== 9 ||
        validation.compositionStatus !== 'pass' ||
        validation.errors !== 0 ||
        validation.warnings !== 0 ||
        result.specification.sha256 !== digest(read(`${name}.json`)) ||
        result.artifact.sha256 !== digest(read(`${name}.html`))
      ) {
        throw new Error(
          `${name}: expected a matching nine-check showcase delivery receipt.`,
        );
      }
      const output = join(directory, `${name}.html`);
      writeFileSync(output, setDefaultTheme(read(`${name}.html`)));
      const checked = JSON.parse(
        execFileSync(process.execPath, [cli, 'check', output], {
          encoding: 'utf8',
        }),
      );
      if (
        !checked.ok ||
        checked.checks.length !== 9 ||
        checked.checks.some((check) => !check.ok) ||
        checked.composition.summary.errors !== 0 ||
        checked.composition.summary.warnings !== 0
      ) {
        throw new Error(`${name}: themed HTML failed final artifact checks.`);
      }
    }
  }
  const records = names.map((name) => {
    const { svg, record } = inspect(name);
    if (mode === 'check') {
      if (read(`${name}.svg`) !== svg)
        throw new Error(`${name}: SVG differs from the delivered HTML export.`);
    } else {
      writeFileSync(join(directory, `${name}.svg`), svg);
    }
    return record;
  });
  const manifest = { schemaVersion: 1, diagrams: records };
  if (mode === 'check') {
    for (const extension of ['html', 'svg']) {
      const artifacts = readdirSync(directory)
        .filter(
          (name) =>
            name.endsWith(`.${extension}`) && !name.includes('.visual-check.'),
        )
        .map((name) => name.slice(0, -(extension.length + 1)))
        .sort();
      if (JSON.stringify(artifacts) !== JSON.stringify(names))
        throw new Error(`Unexpected ${extension} diagram inventory.`);
    }
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (JSON.stringify(previous) !== JSON.stringify(manifest))
      throw new Error(
        'Diagram source, HTML, SVG, or inventory changed; regenerate and review the artifacts.',
      );
    console.log(
      `Diagram consistency: OK (${records.length} source/HTML/SVG sets).`,
    );
  } else {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(
      `Exported ${records.length} diagram sets. Browser and semantic review remain separate.`,
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
