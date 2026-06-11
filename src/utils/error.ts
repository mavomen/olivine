/** Log an error message and terminate the process with exit code 1. */
export function handleError(message: string, err: unknown): never {
  console.error(`[ERROR] ${message}: ${String(err)}`);
  process.exit(1);
}
