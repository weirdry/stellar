#!/usr/bin/env node
import { readWorkMap, renderFile, writeArtifact } from '../lib/render.js';
import { validateWorkMap, WorkMapError } from '../lib/validate.js';
import { normalizeCapture } from '../lib/normalize.js';
import {
  rememberMap,
  refreshState,
  applyChoices,
  writeRun,
} from '../lib/continuity.js';

const usage =
  'Usage: stellar normalize CAPTURE.json DRAFT.json | stellar validate INPUT.json | stellar render INPUT.json OUTPUT.html | stellar remember MAP.json RUN_DIR | stellar refresh STATE.json CAPTURE.json RUN_DIR | stellar classify STATE.json CHOICES.json RUN_DIR | stellar revise STATE.json CHOICES.json RUN_DIR';
const [command, input, output, ...extra] = process.argv.slice(2);
try {
  if (command === '--help' && !input) console.log(usage);
  else if (command === 'remember' && input && output && !extra.length) {
    console.log(
      JSON.stringify(
        await writeRun(rememberMap(await readWorkMap(input)), output),
      ),
    );
  } else if (
    ['refresh', 'classify', 'revise'].includes(command) &&
    input &&
    output &&
    extra.length === 1
  ) {
    const previous = await readWorkMap(input),
      next = await readWorkMap(output);
    const state =
      command === 'refresh'
        ? refreshState(previous, next)
        : applyChoices(previous, next, command === 'revise' ? 'user' : 'agent');
    console.log(JSON.stringify(await writeRun(state, extra[0])));
  } else if (command === 'normalize' && input && output && !extra.length) {
    const data = normalizeCapture(await readWorkMap(input));
    await writeArtifact(input, output, JSON.stringify(data, null, 2) + '\n');
    console.log(
      JSON.stringify({
        normalized: true,
        issues: data.issues.length,
        relations: data.relations.length,
        needsClassification: data.issues.filter((i) => i.scope === 'assigned')
          .length,
      }),
    );
  } else if (command === 'validate' && input && !output) {
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
