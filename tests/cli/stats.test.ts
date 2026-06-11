import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('stats command', () => {
  let tmpDir: string;

  beforeAll(async () => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-stats-test-'));
    execSync(`${CLI} init "${tmpDir}" --algo leitner`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should output JSON when --json flag is used', () => {
    const output = execSync(`${CLI} stats "${tmpDir}" --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('totalNotes');
    expect(parsed).toHaveProperty('dueNotes');
    expect(parsed).toHaveProperty('reviewedToday');
    expect(parsed).toHaveProperty('boxDistribution');
    expect(parsed).toHaveProperty('archivedCount');
    expect(parsed).toHaveProperty('totalReviews');
    expect(parsed).toHaveProperty('streak');
  });

  it('should have correct types in JSON output', () => {
    const output = execSync(`${CLI} stats "${tmpDir}" --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(typeof parsed.totalNotes).toBe('number');
    expect(typeof parsed.dueNotes).toBe('number');
    expect(typeof parsed.reviewedToday).toBe('number');
    expect(typeof parsed.archivedCount).toBe('number');
    expect(typeof parsed.totalReviews).toBe('number');
    expect(typeof parsed.streak).toBe('number');
    expect(typeof parsed.boxDistribution).toBe('object');
  });

  it('should output human-readable format by default', () => {
    const output = execSync(`${CLI} stats "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('Total notes:');
    expect(output).toContain('Due notes:');
  });
});
