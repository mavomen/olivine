import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Return true if the path points to an existing directory. */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/** Return true if the path points to an existing file. */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

/** Ensure a directory exists, creating it (and parents) if needed. */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Recursively read all files under a directory, skipping directories in `ignoreDirs`. */
export async function readDirRecursive(
  dirPath: string,
  ignoreDirs: Set<string> = new Set(),
): Promise<string[]> {
  const entries: string[] = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      if (ignoreDirs.has(item.name)) continue;
      const nested = await readDirRecursive(fullPath, ignoreDirs);
      entries.push(...nested);
    } else {
      entries.push(fullPath);
    }
  }
  return entries;
}
