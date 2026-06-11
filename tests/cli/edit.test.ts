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
});
