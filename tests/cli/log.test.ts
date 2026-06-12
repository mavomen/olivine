import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('log command', () => {
  let tmpDir: string;

  beforeAll(async () => {
    execSync('npm run build', { stdio: 'ignore', cwd: PROJECT_ROOT });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-log-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should reject invalid vault path', () => {
    expect(() =>
      execSync(`${CLI} log "/nonexistent/path" test`, { stdio: 'pipe' }),
    ).toThrow();
  });

  it('should show card not found for unknown note id', () => {
    expect(() =>
      execSync(`${CLI} log "${tmpDir}" nonexistent.md`, { stdio: 'pipe' }),
    ).toThrow('Card not found');
  });

  it('should show review history for a card', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Log Test Card" --content "Answer"`, { stdio: 'pipe' });
    const output = execSync(`${CLI} log "${tmpDir}" log-test-card.md`, { encoding: 'utf-8' });
    expect(output).toContain('Log Test Card');
    expect(output).toContain('REVIEW HISTORY');
  });

  it('should show scheduling info for a card', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Scheduling Test" --content "Content"`, { stdio: 'pipe' });
    const output = execSync(`${CLI} log "${tmpDir}" scheduling-test.md`, { encoding: 'utf-8' });
    expect(output).toContain('Current Scheduling');
    expect(output).toContain('Box:');
    expect(output).toContain('Interval:');
  });
});
