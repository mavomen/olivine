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

  it('should unarchive all archived cards with --all flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Archived Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    // Manually archive the card
    execSync(`sqlite3 "${tmpDir}/.olivine/olivine.db" "UPDATE scheduling SET archived = 1"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} unarchive "${tmpDir}" --all`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('All archived cards unarchived and reset to Box 1.');
  });

  it('should unarchive a specific card with --id flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'specific.md'), '# Specific Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    // Manually archive it
    execSync(`sqlite3 "${tmpDir}/.olivine/olivine.db" "UPDATE scheduling SET archived = 1"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT note_id FROM scheduling WHERE archived = 1 LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    const output = execSync(`${CLI} unarchive "${tmpDir}" --id "${noteId}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('Card unarchived and reset to Box 1.');
  });

  it('should report no archived cards with --all when none archived', () => {
    const output = execSync(`${CLI} unarchive "${tmpDir}" --all`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('No archived cards.');
  });
});
