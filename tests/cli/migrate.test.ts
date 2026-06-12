import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('migrate command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-migrate-test-'));
    execSync(`${CLI} init "${tmpDir}" --algo leitner`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report nothing to migrate when already on target algorithm', () => {
    const output = execSync(`${CLI} migrate "${tmpDir}" --algo leitner --force`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('nothing to migrate');
  });

  it('should reject invalid algorithm name', () => {
    expect(() => execSync(`${CLI} migrate "${tmpDir}" --algo invalid --force`, { stdio: 'pipe' })).toThrow(
      /Invalid algorithm/,
    );
  });

  it('should migrate active cards when --algo and --force are provided', async () => {
    await fs.writeFile(path.join(tmpDir, 'migrate-note.md'), '# Migrate Me');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} migrate "${tmpDir}" --algo sm2 --force`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('Migrated');
    expect(output).toContain('sm2');
  });

  it('should report no active cards when vault has no cards', () => {
    const output = execSync(`${CLI} migrate "${tmpDir}" --algo sm2 --force`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('No active cards to migrate');
  });

  it('should update config algorithm after migration', async () => {
    await fs.writeFile(path.join(tmpDir, 'config-note.md'), '# Config Check');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });
    execSync(`${CLI} migrate "${tmpDir}" --algo sm2 --force`, { stdio: 'pipe' });

    const configOutput = execSync(`${CLI} config "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const config = JSON.parse(configOutput);
    expect(config.algorithm).toBe('sm2');
  });

  it('should require --algo flag in non-TTY mode', () => {
    expect(() => execSync(`${CLI} migrate "${tmpDir}"`, { stdio: 'pipe' })).toThrow(
      /Interactive mode requires a TTY/,
    );
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} migrate /nonexistent --algo sm2 --force`, { stdio: 'pipe' })).toThrow();
  });
});
