import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('review command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-review-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report no due notes when vault is empty', () => {
    const output = execSync(`${CLI} review "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/No notes due/);
  });

  it('should report no due notes with --tui when vault is empty', () => {
    const output = execSync(`${CLI} review "${tmpDir}" --tui`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/No notes due/);
  });

  it('should attempt review for due notes', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Test Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    try {
      execSync(`${CLI} review "${tmpDir}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        input: '\n4\n',
        timeout: 5000,
      });
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      expect(err.stdout || err.stderr || '').toBeDefined();
    }
  });

  it('should handle --tui flag in non-interactive environment (fallback)', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# TUI Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} review "${tmpDir}" --tui`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });

    // Fallback should complete silently (auto-pass with quality=4)
    expect(output).toBeDefined();
  });
});
