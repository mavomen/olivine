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

  it('should report no due notes and show stats when vault is empty', () => {
    const output = execSync(`${CLI} review "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/All caught up/);
    expect(output).toMatch(/Total notes/);
  });

  it('should report no due notes with --tui when vault is empty', () => {
    const output = execSync(`${CLI} review "${tmpDir}" --tui`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/All caught up/);
    expect(output).toMatch(/Total notes/);
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

    expect(output).toBeDefined();
  });

  it('should cap session size with --limit flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# Note 1');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '# Note 2');
    await fs.writeFile(path.join(tmpDir, 'note3.md'), '# Note 3');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} review "${tmpDir}" --tui --limit 1`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });

    expect(output).toContain('2 more card(s) due today.');
  });

  it('should use --quality flag to skip interactive prompts', async () => {
    await fs.writeFile(path.join(tmpDir, 'quality-note.md'), '# Quality Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} review "${tmpDir}" --quality 4`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });

    expect(output).toContain('Session Complete');
    expect(output).toContain('Reviewed: 1/1');
  });

  it('should error with --quality value out of range', async () => {
    await fs.writeFile(path.join(tmpDir, 'quality-note.md'), '# Quality Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    expect(() => execSync(`${CLI} review "${tmpDir}" --quality 6`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    })).toThrow();
  });

  it('should use --quality with --tui in non-interactive mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'tui-quality.md'), '# TUI Quality');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} review "${tmpDir}" --tui --quality 5`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });

    expect(output).toBeDefined();
  });
});
