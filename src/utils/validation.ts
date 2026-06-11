import { directoryExists } from './fs';

/** Throw if the path is empty, whitespace-only, or does not point to an existing directory. */
export async function validateVaultPath(vaultPath: string): Promise<void> {
  if (!vaultPath || vaultPath.trim() === '') {
    throw new Error('Vault path is required');
  }
  if (!(await directoryExists(vaultPath))) {
    throw new Error(`Vault path does not exist or is not a directory: ${vaultPath}`);
  }
}

/** Throw if the provided config object has an invalid shape. */
export function validateConfig(config: unknown): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Config must be an object');
  }
  const cfg = config as Record<string, unknown>;
  if (typeof cfg.vaultPath !== 'string') {
    throw new Error('Config vaultPath must be a string');
  }
  if (cfg.cardsDir !== undefined && typeof cfg.cardsDir !== 'string') {
    throw new Error('Config cardsDir must be a string');
  }
}
