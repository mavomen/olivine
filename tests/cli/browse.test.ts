import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('browse command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-browse-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should require --id in non-TTY mode', () => {
    expect(() => execSync(`${CLI} browse "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' })).toThrow();
  });

  it('should reject --tui in non-TTY mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'tui-note.md'), '# TUI Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    expect(() => execSync(`${CLI} browse "${tmpDir}" --tui`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    })).toThrow();
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} browse /nonexistent`, { stdio: 'pipe' })).toThrow();
  });

  it('should show card with --id flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'card.md'), '# Browse ID Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    const output = execSync(`${CLI} browse "${tmpDir}" --id "${noteId}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    expect(output).toContain('QUESTION');
    expect(output).toContain('Browse ID Card');
  });

  it('should error on --id with non-existent note', () => {
    expect(() => execSync(`${CLI} browse "${tmpDir}" --id nonexistent`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })).toThrow();
  });

  it('should error on --id --json with non-existent note', () => {
    expect(() => execSync(`${CLI} browse "${tmpDir}" --id nonexistent --json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    })).toThrow();
  });

  it('should output JSON with --id --json flags', async () => {
    await fs.writeFile(path.join(tmpDir, 'json-card.md'), '# JSON Card');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    const output = execSync(`${CLI} browse "${tmpDir}" --id "${noteId}" --json`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const parsed = JSON.parse(output);
    expect(parsed.note).toBeDefined();
    expect(parsed.note.title).toBe('JSON Card');
    expect(parsed.scheduling).toBeDefined();
    expect(parsed.reviews).toBeDefined();
  });


});
