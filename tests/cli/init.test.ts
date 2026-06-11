import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('init command', () => {
  let tmpDir: string;

  beforeAll(async () => {
    execSync('npm run build', { stdio: 'ignore', cwd: PROJECT_ROOT });
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

  it('should accept --algo sm2 and persist it in config', async () => {
    execSync(`${CLI} init "${tmpDir}" --algo sm2`, { stdio: 'pipe' });
    const config = JSON.parse(
      await fs.readFile(path.join(tmpDir, '.olivine', 'config.json'), 'utf-8'),
    );
    expect(config.algorithm).toBe('sm2');
  });

  it('should reject --algo with an invalid algorithm name', () => {
    expect(() =>
      execSync(`${CLI} init "${tmpDir}" --algo invalid_algo`, { stdio: 'pipe' }),
    ).toThrow();
  });

  it('should be idempotent when re-initializing an existing vault', async () => {
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    expect(() => execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' })).not.toThrow();
    const dirExists = await fs.stat(path.join(tmpDir, '.olivine')).then(() => true, () => false);
    expect(dirExists).toBe(true);
  });

  it('should use current directory when vault path is omitted', async () => {
    execSync(`${CLI} init`, { stdio: 'pipe', cwd: tmpDir });
    const dirExists = await fs.stat(path.join(tmpDir, '.olivine')).then(() => true, () => false);
    expect(dirExists).toBe(true);
  });
});
