import { isObject, required } from './contracts.ts';
import type { InputRole } from './contracts.ts';
import {
  readFile,
  writeFile,
  rename,
  mkdir,
  rm,
  realpath,
} from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { assertWorkMap, WorkMapError } from './validate.ts';

export async function renderWorkMap(input: unknown) {
  const data = assertWorkMap(input);
  const resources = await Promise.all(
    [
      'shell.html',
      'style.css',
      'app.js',
      `locales/${data.locale}.json`,
      'stellar.svg',
    ].map((name) =>
      readFile(new URL('../assets/viewer/' + name, import.meta.url), 'utf8'),
    ),
  );
  const shell = required(resources[0], 'Viewer shell is loaded.');
  const css = required(resources[1], 'Viewer styles are loaded.');
  const js = required(resources[2], 'Viewer script is loaded.');
  const catalog = required(resources[3], 'Viewer catalog is loaded.');
  const logo = required(resources[4], 'Viewer logo is loaded.');
  // Escape every '<', including closing-script and HTML comment sequences.
  const serialize = (value: object) =>
    JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  const escapeHTML = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char] ?? char,
    );
  const messages: unknown = JSON.parse(catalog);
  if (!isObject(messages) || typeof messages['brand.title'] !== 'string')
    throw new Error('Missing UI message: brand.title');
  const title = messages['brand.title'].replace('{owner}', () => data.owner);
  const values: Record<string, string> = {
    __TITLE__: escapeHTML(title),
    __LOCALE__: data.locale,
    __CSS__: css,
    __JS__: js,
    __DATA__: serialize(data),
    __MESSAGES__: serialize(messages),
    __LOGO__: logo,
    __FAVICON__:
      'data:image/svg+xml;base64,' + Buffer.from(logo).toString('base64'),
  };
  for (const token of Object.keys(values))
    if (shell.split(token).length !== 2)
      throw new Error('Viewer template must contain each slot exactly once.');
  // One pass: user text that resembles a template slot remains literal data.
  return shell.replace(
    /__TITLE__|__LOCALE__|__CSS__|__JS__|__DATA__|__MESSAGES__|__LOGO__|__FAVICON__|\{\{ui\.([\w.]+)\}\}/g,
    (token: string, key: string | undefined) => {
      if (!key) return required(values[token], 'Viewer slot is declared.');
      if (typeof messages[key] !== 'string')
        throw new Error(`Missing UI message: ${key}`);
      return escapeHTML(messages[key]);
    },
  );
}

export async function readWorkMap(
  path: string,
  input: InputRole = 'work-map',
): Promise<unknown> {
  const text = await readFile(path, 'utf8');
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    const label = {
      'work-map': 'Work map',
      state: 'Saved state',
      capture: 'Capture',
      choices: 'Choices input',
    }[input];
    throw new WorkMapError([
      {
        code: 'input-json',
        input,
        path: '/',
        message: `${label} is not valid JSON.`,
        fix: `Repair JSON syntax in the ${input} input before retrying; keep other inputs and previous outputs.`,
      },
    ]);
  }
}

export async function renderFile(input: string, output: string) {
  const html = await renderWorkMap(await readWorkMap(input));
  await writeArtifact(input, output, html);
  return { bytes: Buffer.byteLength(html) };
}

export async function writeArtifact(
  input: string,
  output: string,
  content: string,
) {
  if (
    resolve(input) === resolve(output) ||
    (await realpath(output).catch(() => null)) === (await realpath(input))
  )
    throw new Error('Input and output must be different files.');
  await mkdir(dirname(resolve(output)), { recursive: true });
  const temp = resolve(dirname(output), '.stellar-' + randomUUID() + '.tmp');
  try {
    await writeFile(temp, content, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temp, output);
  } finally {
    await rm(temp, { force: true });
  }
}
