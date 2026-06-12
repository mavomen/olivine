import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('suspend command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-suspend-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should reject invalid vault path', () => {
    expect(() =>
      execSync(`${CLI} suspend "/nonexistent/path" --id test`, { stdio: 'pipe' }),
    ).toThrow();
  });

  it('should suspend a card by id', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Suspend Test" --content "Answer"`, { stdio: 'pipe' });
    const output = execSync(`${CLI} suspend "${tmpDir}" --id suspend-test.md`, { encoding: 'utf-8' });
    expect(output).toContain('suspended');
  });

  it('should error when suspending a non-existent card', () => {
    expect(() =>
      execSync(`${CLI} suspend "${tmpDir}" --id nonexistent.md`, { stdio: 'pipe' }),
    ).toThrow('Card not found or already suspended');
  });

  it('should error when suspending already suspended card', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Double Suspend" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id double-suspend.md`, { stdio: 'pipe' });
    expect(() =>
      execSync(`${CLI} suspend "${tmpDir}" --id double-suspend.md`, { stdio: 'pipe' }),
    ).toThrow('Card not found or already suspended');
  });

  it('should error in non-TTY environment without --id', () => {
    expect(() =>
      execSync(`${CLI} suspend "${tmpDir}"`, { stdio: 'pipe' }),
    ).toThrow('requires a TTY');
  });

  it('should exclude suspended cards from due count', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Due Check" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id due-check.md`, { stdio: 'pipe' });
    const output = execSync(`${CLI} due "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('0 note(s) due');
  });
});

describe('unsuspend command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-unsuspend-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should unsuspend a card by id', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Unsuspend Test" --content "Answer"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id unsuspend-test.md`, { stdio: 'pipe' });
    const output = execSync(`${CLI} unsuspend "${tmpDir}" --id unsuspend-test.md`, { encoding: 'utf-8' });
    expect(output).toContain('unsuspended');
  });

  it('should unsuspend with --all flag', () => {
    execSync(`${CLI} add "${tmpDir}" --title "All Unsuspend" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id all-unsuspend.md`, { stdio: 'pipe' });
    const output = execSync(`${CLI} unsuspend "${tmpDir}" --all`, { encoding: 'utf-8' });
    expect(output).toContain('All');
  });

  it('should error in non-TTY without --id or --all', () => {
    execSync(`${CLI} add "${tmpDir}" --title "No TTY" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id no-tty.md`, { stdio: 'pipe' });
    expect(() =>
      execSync(`${CLI} unsuspend "${tmpDir}"`, { stdio: 'pipe' }),
    ).toThrow('requires a TTY');
  });

  it('should show suspended cards back in due after unsuspend', () => {
    execSync(`${CLI} add "${tmpDir}" --title "Back In Due" --content "Content"`, { stdio: 'pipe' });
    execSync(`${CLI} suspend "${tmpDir}" --id back-in-due.md`, { stdio: 'pipe' });
    execSync(`${CLI} unsuspend "${tmpDir}" --id back-in-due.md`, { stdio: 'pipe' });
    const output = execSync(`${CLI} due "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('1 note(s) due');
  });
});
