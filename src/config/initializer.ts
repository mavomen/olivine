import { promises as fs } from 'node:fs';
import path from 'node:path';
import { OLIVINE_DIR } from './constants';

export async function ensureOlivineDir(vaultPath: string): Promise<string> {
  const dirPath = path.join(vaultPath, OLIVINE_DIR);
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}
