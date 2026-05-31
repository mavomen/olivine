import { promises as fs } from 'node:fs';
import { directoryExists } from './fs';

export async function validateVaultPath(vaultPath: string): Promise<void> {
  if (!vaultPath || vaultPath.trim() === '') {
    throw new Error('Vault path is required');
  }
  if (!(await directoryExists(vaultPath))) {
    throw new Error(`Vault path does not exist or is not a directory: ${vaultPath}`);
  }
}

export function validateConfig(config: unknown): void {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Config must be an object');
  }
  const cfg = config as Record<string, unknown>;
  if (typeof cfg.vaultPath !== 'string') {
    throw new Error('Config vaultPath must be a string');
  }
  if (typeof cfg.dailyReviewLimit !== 'number' || cfg.dailyReviewLimit < 1) {
    throw new Error('Config dailyReviewLimit must be a positive integer');
  }
}
