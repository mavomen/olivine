import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('edit command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-edit-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report no cards when vault is empty', () => {
    const output = execSync(`${CLI} edit "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('No cards found.');
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} edit /nonexistent`, { stdio: 'pipe' })).toThrow();
  });

  it('should report error when --id does not match any card', async () => {
    // First add a card so we don't hit the "no cards" early return
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Test Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    expect(() => execSync(`${CLI} edit "${tmpDir}" --id nonexistent`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })).toThrow();
  });

  it('should report error when --id matches but not a TTY', async () => {
    await fs.writeFile(path.join(tmpDir, 'card.md'), '# Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    expect(() => execSync(`${CLI} edit "${tmpDir}" --id "${noteId}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })).toThrow();
  });
});
