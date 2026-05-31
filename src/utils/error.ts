export function handleError(message: string, err: unknown): never {
  console.error(`[ERROR] ${message}: ${String(err)}`);
  process.exit(1);
}
