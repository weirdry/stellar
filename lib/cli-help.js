import { cliInvocation } from './cli-diagnostics.js';

export const isHelpFlag = (value) => value === '--help' || value === '-h';

// This catalog owns argument counts and help for the public runner commands.
export const commands = {
  doctor: {
    usage: 'doctor [--json]',
    summary:
      'Diagnose the local runtime and installed product files without changing them.',
    min: 0,
    max: 1,
    arguments: [
      '--json  Print structured check results instead of a text summary.',
    ],
    output:
      'Version, installation root, per-check status/remedy, and diagnostic scope. No network, repair, authentication, or host-discovery check.',
    example: 'doctor --json',
  },
  inspect: {
    usage: 'inspect MAP.json [ISSUE [OFFSET]]',
    summary:
      'Read a bounded issue index or the source-block index for one issue.',
    min: 1,
    max: 3,
    arguments: [
      'MAP.json  Normalized draft or work map.',
      'ISSUE  Internal issue ID; omit or use an empty string for the issue index.',
      'OFFSET  Zero-based page offset; default 0.',
    ],
    output:
      'JSON index with bounded previews and pagination. Does not modify the map.',
    example: 'inspect draft.json',
  },
  'read-issue': {
    usage: 'read-issue MAP.json ISSUE BLOCK [OFFSET]',
    summary: 'Read an exact, bounded chunk of a source block.',
    min: 3,
    max: 4,
    arguments: [
      'MAP.json  Normalized draft or work map.',
      'ISSUE  Internal issue ID from inspect.',
      'BLOCK  Zero-based block index from inspect.',
      'OFFSET  Character offset within the block; default 0.',
    ],
    output:
      'JSON with exact source text and continuation information. Does not summarize or classify.',
    example: 'read-issue draft.json ISSUE_ID 0',
  },
  'search-issue': {
    usage: 'search-issue MAP.json ISSUE TEXT [OFFSET]',
    summary: 'Find literal source text within one issue.',
    min: 3,
    max: 4,
    arguments: [
      'MAP.json  Normalized draft or work map.',
      'ISSUE  Internal issue ID from inspect.',
      'TEXT  Literal search text, including --help and -h; quote text containing spaces.',
      'OFFSET  Match-list offset; default 0.',
    ],
    output:
      'JSON with paginated literal matches and context; source data stays unchanged.',
    example: 'search-issue draft.json ISSUE_ID "acceptance criteria"',
  },
  'retain-response': {
    usage: 'retain-response RESPONSE_FILE NEW_FILE',
    summary: 'Retain host-provided response bytes in a fresh private file.',
    min: 2,
    max: 2,
    arguments: [
      'RESPONSE_FILE  Existing response file supplied by the host.',
      'NEW_FILE  New destination; an existing path is refused.',
    ],
    output:
      'JSON byte count and digest, without reprinting the payload. Copies bytes; does not prove source authenticity.',
    example: 'retain-response host-response.json run/evidence/response.json',
  },
  normalize: {
    usage: 'normalize CAPTURE.json DRAFT.json',
    summary:
      'Normalize native source facts into a draft that the agent can classify.',
    min: 2,
    max: 2,
    arguments: [
      'CAPTURE.json  Host capture matching schemas/capture.schema.json.',
      'DRAFT.json  Output draft path, different from the capture; an existing output can be replaced.',
    ],
    output:
      'Writes the draft and prints a JSON summary. Assigned issues still need authored classifications.',
    example: 'normalize capture.json draft.json',
  },
  'classify-draft': {
    usage: 'classify-draft DRAFT.json CHOICES.json RUN_DIR',
    summary:
      'Apply authored first-run decisions and create a complete classified run.',
    min: 3,
    max: 3,
    arguments: [
      'DRAFT.json  Normalized first-run draft.',
      'CHOICES.json  Agent-authored choices matching schemas/choices.schema.json.',
      'RUN_DIR  Fresh directory; an existing path is refused.',
    ],
    output:
      'Writes work-map.json, state.json, and changes.json; prints a JSON run summary. Does not render HTML.',
    example: 'classify-draft draft.json choices.json first-run',
  },
  validate: {
    usage: 'validate MAP.json',
    summary:
      'Check work-map schema and semantic invariants without writing files.',
    min: 1,
    max: 1,
    arguments: [
      'MAP.json  Work map to validate; pending assigned classifications fail.',
    ],
    output:
      'JSON validity and diagnostics. Does not validate source authenticity or classification meaning.',
    example: 'validate first-run/work-map.json',
  },
  render: {
    usage: 'render MAP.json OUTPUT.html',
    summary: 'Render a complete work map using the bundled viewer.',
    min: 2,
    max: 2,
    arguments: [
      'MAP.json  Complete, valid work map.',
      'OUTPUT.html  Destination, different from input; replaces an existing report only on success.',
    ],
    output:
      'Writes standalone HTML and prints a JSON byte count. The report embeds issue data but not private continuity memory.',
    example: 'render first-run/work-map.json first-run/stellar.html',
  },
  'verify-run': {
    usage: 'verify-run CAPTURE.json MAP.json HTML [STATE.json]',
    summary:
      'Compare capture facts, embedded map, bundled viewer, and optional saved state.',
    min: 3,
    max: 4,
    arguments: [
      'CAPTURE.json  Retained capture selected for this run.',
      'MAP.json  Work map used for the report.',
      'HTML  Generated standalone report.',
      'STATE.json  Optional saved state associated with this run.',
    ],
    output:
      'JSON consistency checks; exit 1 on a failed comparison. Reads only; does not establish semantic or visual acceptance.',
    example:
      'verify-run capture.json first-run/work-map.json first-run/stellar.html first-run/state.json',
  },
  remember: {
    usage: 'remember MAP.json RUN_DIR',
    summary: 'Create initial saved state for an existing complete map.',
    min: 2,
    max: 2,
    arguments: [
      'MAP.json  Complete map without a saved continuation state.',
      'RUN_DIR  Fresh directory; an existing path is refused.',
    ],
    output:
      'Writes work-map.json, state.json, and changes.json; prints a JSON run summary. Report-relative references are refused.',
    example: 'remember work-map.json remembered-run',
  },
  refresh: {
    usage: 'refresh STATE.json CAPTURE.json RUN_DIR',
    summary:
      'Apply a fresh source observation while retaining saved user choices.',
    min: 3,
    max: 3,
    arguments: [
      'STATE.json  Selected previous successful saved state.',
      'CAPTURE.json  Fresh host capture.',
      'RUN_DIR  Fresh directory; an existing path is refused.',
    ],
    output:
      'Writes a new map, state, and change summary. Pending classifications may require classify before validation/rendering.',
    example: 'refresh first-run/state.json fresh-capture.json refreshed-run',
  },
  classify: {
    usage: 'classify STATE.json CHOICES.json RUN_DIR',
    summary:
      'Apply agent decisions to saved state while protecting explicit user choices.',
    min: 3,
    max: 3,
    arguments: [
      'STATE.json  Saved state to continue.',
      'CHOICES.json  Agent-authored choices; user-owned values cannot be overwritten.',
      'RUN_DIR  Fresh directory; an existing path is refused.',
    ],
    output:
      'Writes a new map, state, and change summary; prints JSON. Leaves previous runs intact.',
    example: 'classify refreshed-run/state.json choices.json classified-run',
  },
  revise: {
    usage: 'revise STATE.json CHOICES.json RUN_DIR',
    summary: 'Record an explicit user correction with user ownership.',
    min: 3,
    max: 3,
    arguments: [
      'STATE.json  Saved state to continue.',
      "CHOICES.json  Choices representing the user's explicit request.",
      'RUN_DIR  Fresh directory; an existing path is refused.',
    ],
    output:
      'Writes a new map, state, and change summary; prints JSON. Leaves previous runs intact.',
    example: 'revise first-run/state.json user-choices.json revised-run',
  },
  help: {
    usage: 'help [COMMAND]',
    summary:
      'Show global or command-specific usage without executing a workflow.',
    min: 0,
    max: 1,
    arguments: ['COMMAND  Command name; omit to list all commands.'],
    output:
      'Plain-text help. COMMAND --help and COMMAND -h are equivalent to help COMMAND.',
    example: 'help doctor',
  },
};

export function commandInfo(name) {
  return Object.hasOwn(commands, name) ? commands[name] : undefined;
}

export function helpText(name) {
  const info = commandInfo(name);
  const exitCodes =
    'Exit codes: 0 success; 1 failed check or execution error; 2 invalid command usage.';
  const invocation = cliInvocation();
  if (!info)
    return [
      'Stellar — inspect, classify, and render local work maps.',
      `Usage: ${invocation} <command> [arguments]`,
      '',
      ...Object.entries(commands).map(
        ([command, entry]) => `  ${command.padEnd(17)} ${entry.summary}`,
      ),
      '',
      'Options: --version, -V  Print the product version; --help, -h  Show this help.',
      `Run ${invocation} help <command> or ${invocation} <command> --help (alias -h) for arguments and examples.`,
      exitCodes,
    ].join('\n');
  return [
    info.summary,
    `Usage: ${invocation} ${info.usage}`,
    '',
    'Arguments:',
    ...info.arguments.map((argument) => `  ${argument}`),
    '',
    `Output: ${info.output}`,
    `Example: ${invocation} ${info.example}`,
    exitCodes,
  ].join('\n');
}
