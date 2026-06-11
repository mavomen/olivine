import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('unarchive command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-unarchive-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report no archived cards when vault is empty', () => {
    const output = execSync(`${CLI} unarchive "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('No archived cards.');
  });

  it('should report no archived cards when no cards are archived', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Active Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} unarchive "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('No archived cards.');
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} unarchive /nonexistent`, { stdio: 'pipe' })).toThrow();
  });
});
