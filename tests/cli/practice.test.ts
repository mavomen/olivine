import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('practice command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-practice-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report all caught up when no due notes', () => {
    const output = execSync(`${CLI} practice "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/All caught up/);
  });

  it('should run without error when due notes exist', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Practice Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} practice "${tmpDir}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    expect(output).toBeDefined();
  });

  it('should accept --tag flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'tagged.md'), '---\ntitle: Tagged Note\ntags: [math]\n---\n\nMath content');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} practice "${tmpDir}" --tag math`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    expect(output).toBeDefined();
  });

  it('should accept --algo flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'algo-note.md'), '# Algo Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} practice "${tmpDir}" --algo sm2`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    expect(output).toBeDefined();
  });

  it('should accept --shuffle flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'shuffle-note.md'), '# Shuffle Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} practice "${tmpDir}" --shuffle`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    expect(output).toBeDefined();
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} practice /nonexistent`, { stdio: 'pipe' })).toThrow();
  });

  it('should cap session size with --limit flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# Note 1');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '# Note 2');
    await fs.writeFile(path.join(tmpDir, 'note3.md'), '# Note 3');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} practice "${tmpDir}" --limit 2`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });

    expect(output).toContain('1 more card(s) due today.');
  });
});
