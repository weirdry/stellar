// Printed commands must work without a separately installed PATH launcher.
export function cliInvocation() {
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  return `${quote(process.execPath)} ${quote(process.argv[1])}`;
}

// Schema parser/compiler messages can contain resource contents. Report the
// error category and an owning code location without printing those messages.
export function errorSummary(error) {
  const kind =
    [SyntaxError, ReferenceError, TypeError, RangeError].find(
      (type) => error instanceof type,
    )?.name ?? 'Error';
  const code = ['ENOENT', 'EACCES', 'EPERM', 'ERR_MODULE_NOT_FOUND'].includes(
    error?.code,
  )
    ? ` (${error.code})`
    : '';
  if (!(error instanceof Error)) return kind;
  const header = `${error.name}: ${error.message}`;
  // Remove the entire message first, including any embedded newline/frame text.
  const frames = error.stack?.startsWith(header)
    ? error.stack.slice(header.length).split('\n')
    : [];
  const root = new URL('../', import.meta.url).href;
  for (const frame of frames) {
    if (!frame.startsWith('    at ') || !frame.includes(root)) continue;
    const location = frame
      .slice(frame.indexOf(root) + root.length)
      .match(/^((?:bin|lib)\/[\w./%-]+:\d+:\d+)\)?$/)?.[1];
    if (location) return `${kind}${code} at ${location}`;
  }
  return `${kind}${code}`;
}
