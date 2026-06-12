import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('scan command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-scan-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should scan vault and detect markdown files', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# First Note');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '# Second Note');

    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/2 notes added/);
  });

  it('should handle empty vault gracefully', async () => {
    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/0 notes added/);
  });

  it('should detect newly added files on re-scan', async () => {
    await fs.writeFile(path.join(tmpDir, 'first.md'), '# First');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    await fs.writeFile(path.join(tmpDir, 'second.md'), '# Second');
    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/1 notes added/);
  });

  it('should discover markdown files in subdirectories', async () => {
    await fs.mkdir(path.join(tmpDir, 'subdir'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, 'subdir', 'deep.md'), '# Deep');

    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/1 notes added/);
  });

  it('should ignore non-markdown files and .obsidian directory', async () => {
    await fs.writeFile(path.join(tmpDir, 'image.png'), 'fake-png');
    await fs.writeFile(path.join(tmpDir, 'notes.txt'), 'text');
    await fs.mkdir(path.join(tmpDir, '.obsidian'), { recursive: true });
    await fs.writeFile(path.join(tmpDir, '.obsidian', 'config.json'), '{}');

    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/0 notes added/);
  });
});
