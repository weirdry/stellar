#!/usr/bin/env node
import { readWorkMap, renderFile } from '../lib/render.js';
import { validateWorkMap, WorkMapError } from '../lib/validate.js';

const usage =
  'Usage: stellar validate INPUT.json | stellar render INPUT.json OUTPUT.html';
const [command, input, output, ...extra] = process.argv.slice(2);
try {
  if (command === '--help' && !input) console.log(usage);
  else if (command === 'validate' && input && !output) {
    const result = validateWorkMap(await readWorkMap(input));
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
  } else if (command === 'render' && input && output && !extra.length) {
    const result = await renderFile(input, output);
    console.log(JSON.stringify({ rendered: true, ...result }));
  } else {
    console.error(usage);
    process.exitCode = 2;
  }
} catch (error) {
  // Diagnostics contain paths and repairs, never a copy of the private input.
  if (error instanceof WorkMapError)
    console.error(
      JSON.stringify({ valid: false, diagnostics: error.diagnostics }, null, 2),
    );
  else
    console.error(
      error instanceof SyntaxError ? 'Input is not valid JSON.' : error.message,
    );
  process.exitCode = 1;
}
