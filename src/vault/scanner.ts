import { promises as fs } from 'node:fs';
import path from 'node:path';
import { IGNORED_DIRS } from '../config/constants';

/** A markdown file discovered during vault scanning. */
export interface ScannedFile {
  fullPath: string;
  relativePath: string;
  name: string;
}

/** Recursively walk the vault directory and return all `.md` files, skipping ignored directories. */
export async function scanVault(vaultPath: string): Promise<ScannedFile[]> {
  const results: ScannedFile[] = [];
  await walkDir(vaultPath, vaultPath, results);
  return results;
}

async function walkDir(basePath: string, currentPath: string, results: ScannedFile[]): Promise<void> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      await walkDir(basePath, fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(basePath, fullPath);
      results.push({ fullPath, relativePath, name: entry.name });
    }
  }
}
