import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OLIVINE_DIR, CONFIG_FILENAME, DEFAULT_ALGORITHM } from './constants';

/** Olivine vault configuration. */
export interface OlivineConfig {
  vaultPath: string;
  cardsDir: string;
  algorithm: string;
}

/**
 * Returns the default configuration.
 * @returns An OlivineConfig with default values
 */
export function defaultConfig(): OlivineConfig {
  return {
    vaultPath: '',
    cardsDir: '',
    algorithm: DEFAULT_ALGORITHM,
  };
}

/**
 * Loads configuration from the vault's config file, falling back to defaults.
 * @param vaultPath - Path to the Obsidian vault
 * @returns The loaded or default configuration
 */
export async function loadConfig(vaultPath: string): Promise<OlivineConfig> {
  const configPath = path.join(vaultPath, OLIVINE_DIR, CONFIG_FILENAME);
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<OlivineConfig>;
    return {
      vaultPath: parsed.vaultPath ?? vaultPath,
      cardsDir: parsed.cardsDir ?? '',
      algorithm: parsed.algorithm ?? DEFAULT_ALGORITHM,
    };
  } catch {
    return { ...defaultConfig(), vaultPath };
  }
}

/**
 * Saves configuration to the vault's config file, creating the directory if needed.
 * @param vaultPath - Path to the Obsidian vault
 * @param config - The configuration to save
 */
export async function saveConfig(vaultPath: string, config: OlivineConfig): Promise<void> {
  const dirPath = path.join(vaultPath, OLIVINE_DIR);
  const configPath = path.join(dirPath, CONFIG_FILENAME);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
