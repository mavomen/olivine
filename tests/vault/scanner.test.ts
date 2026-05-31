import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanVault } from '../../src/vault/scanner';

describe('vault scanner', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-vault-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should return an empty array for an empty directory', async () => {
    const files = await scanVault(tmpDir);
    expect(files).toEqual([]);
  });

  it('should discover .md files', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# Hello');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '# World');
    await fs.writeFile(path.join(tmpDir, 'readme.txt'), 'not a note');
    const files = await scanVault(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.relativePath).sort()).toEqual(['note1.md', 'note2.md']);
  });

  it('should recursively traverse subdirectories', async () => {
    await fs.mkdir(path.join(tmpDir, 'sub'));
    await fs.writeFile(path.join(tmpDir, 'root.md'), '');
    await fs.writeFile(path.join(tmpDir, 'sub', 'nested.md'), '');
    const files = await scanVault(tmpDir);
    expect(files).toHaveLength(2);
    const paths = files.map((f) => f.relativePath).sort();
    expect(paths).toEqual(['root.md', 'sub/nested.md']);
  });

  it('should ignore .obsidian directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.obsidian'));
    await fs.writeFile(path.join(tmpDir, '.obsidian', 'config'), '');
    await fs.writeFile(path.join(tmpDir, 'note.md'), '');
    const files = await scanVault(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]?.relativePath).toBe('note.md');
  });

  it('should ignore .olivine directory', async () => {
    await fs.mkdir(path.join(tmpDir, '.olivine'));
    await fs.writeFile(path.join(tmpDir, '.olivine', 'data.db'), '');
    await fs.writeFile(path.join(tmpDir, 'note.md'), '');
    const files = await scanVault(tmpDir);
    expect(files).toHaveLength(1);
  });
});
