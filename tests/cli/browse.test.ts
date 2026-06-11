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

  it('should show no cards message when vault is empty', () => {
    const output = execSync(`${CLI} browse "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('No cards to display');
  });

  it('should hint about --all flag when no cards displayed', () => {
    const output = execSync(`${CLI} browse "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('--all');
  });

  it('should render --tui without error in non-TTY (fallback)', async () => {
    await fs.writeFile(path.join(tmpDir, 'tui-note.md'), '# TUI Note');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} browse "${tmpDir}" --tui`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    expect(output).toBeDefined();
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} browse /nonexistent`, { stdio: 'pipe' })).toThrow();
  });
});
