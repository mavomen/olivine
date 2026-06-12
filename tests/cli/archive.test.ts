import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('archive command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-archive-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should reject invalid vault path', () => {
    expect(() =>
      execSync(`${CLI} archive "/nonexistent/path" --id test`, { stdio: 'pipe' }),
    ).toThrow();
  });

  it('should archive a card by id', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Test Card" --content "Answer"`, { stdio: 'pipe' });
    const output = execSync(`${CLI} archive "${tmpDir}" --id test-card.md`, { encoding: 'utf-8' });
    expect(output).toContain('archived');
  });

  it('should error when archiving a non-existent card', () => {
    expect(() =>
      execSync(`${CLI} archive "${tmpDir}" --id nonexistent.md`, { stdio: 'pipe' }),
    ).toThrow('Card not found or already archived');
  });

  it('should error when archiving already archived card', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Test" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} archive "${tmpDir}" --id test.md`, { stdio: 'pipe' });
    expect(() =>
      execSync(`${CLI} archive "${tmpDir}" --id test.md`, { stdio: 'pipe' }),
    ).toThrow('Card not found or already archived');
  });

  it('should error in non-TTY environment without --id', () => {
    expect(() =>
      execSync(`${CLI} archive "${tmpDir}"`, { stdio: 'pipe' }),
    ).toThrow('requires a TTY');
  });

  it('should show archived card via browse --all', () => {
    execSync(`${CLI} add "${tmpDir}" --title "To Archive" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} archive "${tmpDir}" --id to-archive.md`, { stdio: 'pipe' });
    const output = execSync(`${CLI} browse "${tmpDir}" --id to-archive.md --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed.scheduling.archived).toBe(1);
  });
});
