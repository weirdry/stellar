import { readWorkMap, renderFile, writeArtifact } from './render.js';
import { validateWorkMap, WorkMapError } from './validate.js';
import { normalizeCapture } from './normalize.js';
import { verifyRunFiles } from './verify.js';
import {
  inspectMap,
  readIssue,
  searchIssue,
  readReadingMap,
} from './reading.js';
import { retainResponse } from './evidence.js';
import {
  rememberMap,
  classifyDraft,
  refreshState,
  applyChoices,
  writeRun,
} from './continuity.js';

// bin/stellar.js validates argument counts before loading these schema readers.
export async function runCommand(command, args) {
  const [input, output, ...extra] = args;
  try {
    if (command === 'retain-response') {
      console.log(JSON.stringify(await retainResponse(input, output)));
    } else if (command === 'inspect') {
      console.log(
        JSON.stringify(
          inspectMap(await readReadingMap(input), output, extra[0]),
          null,
          2,
        ),
      );
    } else if (['read-issue', 'search-issue'].includes(command)) {
      const operation = command === 'read-issue' ? readIssue : searchIssue;
      console.log(
        JSON.stringify(
          operation(await readReadingMap(input), output, extra[0], extra[1]),
          null,
          2,
        ),
      );
    } else if (command === 'verify-run') {
      const result = await verifyRunFiles(input, output, extra[0], extra[1]);
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exitCode = 1;
    } else if (command === 'remember') {
      console.log(
        JSON.stringify(
          await writeRun(rememberMap(await readWorkMap(input)), output),
        ),
      );
    } else if (command === 'classify-draft') {
      const draft = await readWorkMap(input),
        choices = await readWorkMap(output, 'choices');
      console.log(
        JSON.stringify(await writeRun(classifyDraft(draft, choices), extra[0])),
      );
    } else if (['refresh', 'classify', 'revise'].includes(command)) {
      const previous = await readWorkMap(input, 'state'),
        next = await readWorkMap(
          output,
          command === 'refresh' ? 'capture' : 'choices',
        );
      const state =
        command === 'refresh'
          ? refreshState(previous, next)
          : applyChoices(
              previous,
              next,
              command === 'revise' ? 'user' : 'agent',
            );
      console.log(JSON.stringify(await writeRun(state, extra[0])));
    } else if (command === 'normalize') {
      const data = normalizeCapture(await readWorkMap(input, 'capture'));
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
    } else if (command === 'validate') {
      const result = validateWorkMap(await readWorkMap(input));
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exitCode = 1;
    } else if (command === 'render') {
      const result = await renderFile(input, output);
      console.log(JSON.stringify({ rendered: true, ...result }));
    } else {
      throw new Error('Unsupported runtime command.');
    }
  } catch (error) {
    // Diagnostics contain paths and repairs, never a copy of the private input.
    if (error instanceof WorkMapError)
      console.error(
        JSON.stringify(
          { valid: false, diagnostics: error.diagnostics },
          null,
          2,
        ),
      );
    else
      console.error(
        error instanceof SyntaxError
          ? 'Input is not valid JSON.'
          : error.message,
      );
    process.exitCode = 1;
  }
}
