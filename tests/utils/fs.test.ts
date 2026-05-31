import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { directoryExists, fileExists, ensureDir, readDirRecursive } from '../../src/utils/fs';

describe('filesystem utilities', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('directoryExists', () => {
    it('should return true for an existing directory', async () => {
      expect(await directoryExists(tmpDir)).toBe(true);
    });

    it('should return false for a non-existent path', async () => {
      const nonexistent = path.join(tmpDir, 'nope');
      expect(await directoryExists(nonexistent)).toBe(false);
    });

    it('should return false for a file', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'hello');
      expect(await directoryExists(filePath)).toBe(false);
    });
  });

  describe('fileExists', () => {
    it('should return true for an existing file', async () => {
      const filePath = path.join(tmpDir, 'test.txt');
      await fs.writeFile(filePath, 'hello');
      expect(await fileExists(filePath)).toBe(true);
    });

    it('should return false for a directory', async () => {
      expect(await fileExists(tmpDir)).toBe(false);
    });

    it('should return false for a non-existent path', async () => {
      expect(await fileExists(path.join(tmpDir, 'nope.txt'))).toBe(false);
    });
  });

  describe('ensureDir', () => {
    it('should create a directory if it does not exist', async () => {
      const newDir = path.join(tmpDir, 'new-dir');
      await ensureDir(newDir);
      const stat = await fs.stat(newDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should not throw if directory already exists', async () => {
      await ensureDir(tmpDir);
    });

    it('should create nested directories', async () => {
      const nested = path.join(tmpDir, 'a', 'b', 'c');
      await ensureDir(nested);
      const stat = await fs.stat(nested);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('readDirRecursive', () => {
    it('should return an empty array for an empty directory', async () => {
      const entries = await readDirRecursive(tmpDir);
      expect(entries).toEqual([]);
    });

    it('should list all files recursively', async () => {
      await fs.writeFile(path.join(tmpDir, 'file1.txt'), '');
      await fs.mkdir(path.join(tmpDir, 'sub'));
      await fs.writeFile(path.join(tmpDir, 'sub', 'file2.txt'), '');
      const entries = await readDirRecursive(tmpDir);
      expect(entries.length).toBe(2);
    });

    it('should skip ignored directories', async () => {
      await fs.mkdir(path.join(tmpDir, '.obsidian'));
      await fs.writeFile(path.join(tmpDir, '.obsidian', 'config'), '');
      await fs.writeFile(path.join(tmpDir, 'note.md'), '');
      const entries = await readDirRecursive(tmpDir, new Set(['.obsidian']));
      expect(entries.length).toBe(1);
      expect(entries[0]).toMatch(/note\.md$/);
    });
  });
});
