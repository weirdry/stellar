import { required, property } from './contracts.ts';
import { readWorkMap, renderFile, writeArtifact } from './render.ts';
import { validateWorkMap, WorkMapError } from './validate.ts';
import { normalizeCapture } from './normalize.ts';
import { verifyRunFiles } from './verify.ts';
import {
  inspectMap,
  readIssue,
  searchIssue,
  readReadingMap,
} from './reading.ts';
import { retainResponse } from './evidence.ts';
import {
  rememberMap,
  classifyDraft,
  refreshState,
  applyChoices,
  writeRun,
} from './continuity.ts';

// bin/stellar.ts validates argument counts before loading these schema readers.
export async function runCommand(command: string, args: string[]) {
  const input = required(args[0], 'CLI argument count was validated.');
  const [, output, ...extra] = args;
  const second = () => required(output, 'CLI output argument was validated.');
  const third = () => required(extra[0], 'CLI third argument was validated.');
  try {
    if (command === 'retain-response') {
      console.log(JSON.stringify(await retainResponse(input, second())));
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
      const result = await verifyRunFiles(input, second(), third(), extra[1]);
      console.log(JSON.stringify(result, null, 2));
      if (!result.valid) process.exitCode = 1;
    } else if (command === 'remember') {
      console.log(
        JSON.stringify(
          await writeRun(rememberMap(await readWorkMap(input)), second()),
        ),
      );
    } else if (command === 'classify-draft') {
      const draft = await readWorkMap(input),
        choices = await readWorkMap(second(), 'choices');
      console.log(
        JSON.stringify(await writeRun(classifyDraft(draft, choices), third())),
      );
    } else if (['refresh', 'classify', 'revise'].includes(command)) {
      const previous = await readWorkMap(input, 'state'),
        next = await readWorkMap(
          second(),
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
      console.log(JSON.stringify(await writeRun(state, third())));
    } else if (command === 'normalize') {
      const data = normalizeCapture(await readWorkMap(input, 'capture'));
      await writeArtifact(
        input,
        second(),
        JSON.stringify(data, null, 2) + '\n',
      );
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
      const result = await renderFile(input, second());
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
          : property(error, 'message'),
      );
    process.exitCode = 1;
  }
}
