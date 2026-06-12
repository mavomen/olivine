import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('due command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-due-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should output JSON with --json flag', () => {
    const output = execSync(`${CLI} due "${tmpDir}" --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('dueNotes');
    expect(parsed).toHaveProperty('totalNotes');
    expect(parsed).toHaveProperty('totalReviews');
    expect(parsed).toHaveProperty('date');
    expect(parsed).toHaveProperty('tag');
    expect(typeof parsed.dueNotes).toBe('number');
  });

  it('should output human-readable format by default', () => {
    const output = execSync(`${CLI} due "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/\d+ note\(s\) due/);
  });
});
