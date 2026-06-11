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

  it('should edit card non-interactively with --id --title --content', async () => {
    await fs.writeFile(path.join(tmpDir, 'edit-me.md'), '# Original Title\n\nOriginal content');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    const output = execSync(
      `${CLI} edit "${tmpDir}" --id "${noteId}" --title "New Title" --content "New content"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );

    expect(output).toContain('Card updated');

    // Verify DB was updated
    const dbOutput = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT title FROM notes WHERE id='${noteId}'"`,
      { encoding: 'utf-8' },
    ).trim();
    expect(dbOutput).toBe('New Title');
  });

  it('should edit with --tags in non-interactive mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'tag-card.md'), '# Tag Card\n\nSome content');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    const output = execSync(
      `${CLI} edit "${tmpDir}" --id "${noteId}" --title "Tagged" --content "Taggable" --tags "foo, bar"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );

    expect(output).toContain('Card updated');

    const tagsJson = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT tags FROM notes WHERE id='${noteId}'"`,
      { encoding: 'utf-8' },
    ).trim();
    const tags = JSON.parse(tagsJson);
    expect(tags).toContain('foo');
    expect(tags).toContain('bar');
  });

  it('should error on --id without --content in non-TTY mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'partial.md'), '# Partial');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    expect(() => execSync(
      `${CLI} edit "${tmpDir}" --id "${noteId}" --title "Only Title"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    )).toThrow();
  });

  it('should error on --id without --title in non-TTY mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'partial.md'), '# Partial');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    expect(() => execSync(
      `${CLI} edit "${tmpDir}" --id "${noteId}" --content "Some content"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    )).toThrow();
  });

  it('should error on non-TTY edit without --title or --content', async () => {
    await fs.writeFile(path.join(tmpDir, 'partial.md'), '# Partial');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const noteId = execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "SELECT id FROM notes LIMIT 1"`,
      { encoding: 'utf-8' },
    ).trim();

    expect(() => execSync(
      `${CLI} edit "${tmpDir}" --id "${noteId}" --title "Only Title"`,
      { encoding: 'utf-8', stdio: 'pipe' },
    )).toThrow();
  });
});
