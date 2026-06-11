import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('export command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-export-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should export valid JSON with version and notes array', () => {
    const output = execSync(`${CLI} export "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const data = JSON.parse(output);
    expect(data).toHaveProperty('version', 1);
    expect(data).toHaveProperty('exportedAt');
    expect(Array.isArray(data.notes)).toBe(true);
  });

  it('should export empty notes array for empty vault', () => {
    const output = execSync(`${CLI} export "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const data = JSON.parse(output);
    expect(data.notes).toHaveLength(0);
  });

  it('should include scheduling and reviews for each note', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), '# Export Test');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} export "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const data = JSON.parse(output);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toHaveProperty('id');
    expect(data.notes[0]).toHaveProperty('title', 'Export Test');
    expect(data.notes[0].scheduling).toBeTruthy();
    expect(Array.isArray(data.notes[0].reviews)).toBe(true);
  });

  it('should write to file with --output flag', async () => {
    const outFile = path.join(tmpDir, 'backup.json');
    execSync(`${CLI} export "${tmpDir}" --output "${outFile}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const content = await fs.readFile(outFile, 'utf-8');
    const data = JSON.parse(content);
    expect(data.version).toBe(1);
    expect(Array.isArray(data.notes)).toBe(true);
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} export /nonexistent`, { stdio: 'pipe' })).toThrow();
  });
});
