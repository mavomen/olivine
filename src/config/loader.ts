import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OLIVINE_DIR, CONFIG_FILENAME } from './constants';

export interface OlivineConfig {
  vaultPath: string;
  cardsDir: string;
}

export function defaultConfig(): OlivineConfig {
  return {
    vaultPath: '',
    cardsDir: '',
  };
}

export async function loadConfig(vaultPath: string): Promise<OlivineConfig> {
  const configPath = path.join(vaultPath, OLIVINE_DIR, CONFIG_FILENAME);
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<OlivineConfig>;
    return {
      vaultPath: parsed.vaultPath ?? vaultPath,
      cardsDir: parsed.cardsDir ?? '',
    };
  } catch {
    return { ...defaultConfig(), vaultPath };
  }
}

export async function saveConfig(vaultPath: string, config: OlivineConfig): Promise<void> {
  const dirPath = path.join(vaultPath, OLIVINE_DIR);
  const configPath = path.join(dirPath, CONFIG_FILENAME);
  await fs.mkdir(dirPath, { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
