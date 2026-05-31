import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('init command', () => {
  let tmpDir: string;

  beforeAll(async () => {
    // ensure dist exists
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-init-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should create .olivine directory', async () => {
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    const dirExists = await fs.stat(path.join(tmpDir, '.olivine')).then(() => true, () => false);
    expect(dirExists).toBe(true);
  });

  it('should create SQLite database', async () => {
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    const dbExists = await fs.stat(path.join(tmpDir, '.olivine', 'olivine.db')).then(() => true, () => false);
    expect(dbExists).toBe(true);
  });

  it('should create config.json', async () => {
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    const configExists = await fs.stat(path.join(tmpDir, '.olivine', 'config.json')).then(() => true, () => false);
    expect(configExists).toBe(true);
  });
});
