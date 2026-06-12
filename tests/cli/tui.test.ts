import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('tui command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-tui-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should reject invalid vault path', () => {
    expect(() =>
      execSync(`${CLI} tui "/nonexistent/path"`, { stdio: 'pipe' }),
    ).toThrow();
  });

  it('should throw error in non-TTY environment', () => {
    expect(() =>
      execSync(`${CLI} tui "${tmpDir}"`, { stdio: 'pipe' }),
    ).toThrow('TUI dashboard requires a TTY');
  });
});
