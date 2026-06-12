/** Log an error message and terminate the process with exit code 1. */
export function handleError(message: string, err: unknown): never {
  if (err instanceof Error) {
    console.error(`[ERROR] ${message}: ${err.stack}`);
  } else {
    console.error(`[ERROR] ${message}: ${String(err)}`);
  }
  process.exit(1);
}
