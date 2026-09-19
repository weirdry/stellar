#!/usr/bin/env node
import { version } from '../lib/version.js';
import { commandInfo, helpText } from '../lib/cli-help.js';
import { cliInvocation, errorSummary } from '../lib/cli-diagnostics.js';

const [command, ...args] = process.argv.slice(2);
function usageError(message, name) {
  console.error(
    `${message} Run ${cliInvocation()} ${commandInfo(name) ? `help ${name}` : '--help'} for usage.`,
  );
  process.exitCode = 2;
}

async function main() {
  if (command === '--version' || command === '-V') {
    if (args.length) return usageError('Version flags take no arguments.');
    console.log(`stellar ${version}`);
    return;
  }
  if (command === '--help' || command === 'help') {
    if (command === '--help' && args.length)
      return usageError('Global --help takes no arguments.');
    if (
      args.length > 1 ||
      (args.length && !commandInfo(args[0]) && args[0] !== '--help')
    )
      return usageError('Unknown help topic or too many arguments.', 'help');
    console.log(helpText(args[0] === '--help' ? 'help' : args[0]));
    return;
  }
  const info = commandInfo(command);
  if (!info)
    return usageError(command ? 'Unknown command.' : 'A command is required.');
  if (args.length === 1 && args[0] === '--help') {
    console.log(helpText(command));
    return;
  }
  // TEXT is literal data for search-issue, even when its value is "--help".
  if (
    args.some(
      (arg, index) =>
        arg === '--help' && !(command === 'search-issue' && index === 2),
    )
  )
    return usageError(
      '--help cannot be combined with other arguments.',
      command,
    );
  if (
    args.length < info.min ||
    args.length > info.max ||
    // Empty reader search/block values keep their established data diagnostics.
    args.slice(0, Math.min(info.min, 2)).some((arg) => !arg)
  )
    return usageError('Invalid arguments.', command);
  if (command === 'doctor') {
    if (args.length && args[0] !== '--json')
      return usageError('Unknown doctor option.', command);
    const { doctor, formatDoctor } = await import('../lib/installation.js');
    const result = await doctor();
    console.log(
      args[0] === '--json'
        ? JSON.stringify(result, null, 2)
        : formatDoctor(result),
    );
    if (!result.ok) process.exitCode = 1;
    return;
  }
  // Runtime imports read schemas. Keep them behind the non-executing commands
  // so a damaged installation still exposes version, help, and doctor.
  let runCommand;
  try {
    ({ runCommand } = await import('../lib/cli-commands.js'));
  } catch (error) {
    console.error(
      `Stellar could not load its runtime (${errorSummary(error)}).`,
    );
    console.error(
      `Run ${cliInvocation()} doctor for installation diagnostics. If doctor passes, investigate the runtime code/dependencies at the reported location; doctor checks installed file consistency, not runtime execution or current checkout source.`,
    );
    process.exitCode = 1;
    return;
  }
  await runCommand(command, args);
}

try {
  await main();
} catch (error) {
  console.error(
    `Stellar CLI failed (${errorSummary(error)}). Run ${cliInvocation()} help for command usage.`,
  );
  process.exitCode = 1;
}
