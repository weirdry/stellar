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
import { assertWorkMap } from './validate.js';

export async function renderWorkMap(data) {
  assertWorkMap(data);
  const [shell, css, js] = await Promise.all(
    ['shell.html', 'style.css', 'app.js'].map((name) =>
      readFile(new URL('../assets/viewer/' + name, import.meta.url), 'utf8'),
    ),
  );
  // Escape every '<', including closing-script and HTML comment sequences.
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const escapedTitle = data.title.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
  const values = {
    __TITLE__: escapedTitle,
    __CSS__: css,
    __JS__: js,
    __DATA__: json,
  };
  for (const token of Object.keys(values))
    if (shell.split(token).length !== 2)
      throw new Error('Viewer template must contain each slot exactly once.');
  // One pass: user text that resembles a template slot remains literal data.
  return shell.replace(
    /__TITLE__|__CSS__|__JS__|__DATA__/g,
    (token) => values[token],
  );
}

export async function readWorkMap(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function renderFile(input, output) {
  if (
    resolve(input) === resolve(output) ||
    (await realpath(output).catch(() => null)) === (await realpath(input))
  )
    throw new Error('Input and output must be different files.');
  const html = await renderWorkMap(await readWorkMap(input));
  await mkdir(dirname(resolve(output)), { recursive: true });
  const temp = resolve(dirname(output), '.stellar-' + randomUUID() + '.tmp');
  try {
    await writeFile(temp, html, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await rename(temp, output);
  } finally {
    await rm(temp, { force: true });
  }
  return { bytes: Buffer.byteLength(html) };
}
