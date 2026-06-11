import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('config command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-config-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should print current configuration as JSON', () => {
    const output = execSync(`${CLI} config "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('vaultPath', tmpDir);
    expect(parsed).toHaveProperty('algorithm', 'leitner');
  });

  it('should update cardsDir with --set', () => {
    execSync(`${CLI} config "${tmpDir}" --set cardsDir=mycards`, { stdio: 'pipe' });
    const output = execSync(`${CLI} config "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const parsed = JSON.parse(output);
    expect(parsed.cardsDir).toBe('mycards');
  });

  it('should update algorithm with --set', () => {
    execSync(`${CLI} config "${tmpDir}" --set algorithm=sm2`, { stdio: 'pipe' });
    const output = execSync(`${CLI} config "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const parsed = JSON.parse(output);
    expect(parsed.algorithm).toBe('sm2');
  });

  it('should reject invalid algorithm', () => {
    expect(() => execSync(`${CLI} config "${tmpDir}" --set algorithm=fsrs`, { stdio: 'pipe' })).toThrow(
      /Invalid algorithm/,
    );
  });

  it('should reject unknown config key', () => {
    expect(() => execSync(`${CLI} config "${tmpDir}" --set foo=bar`, { stdio: 'pipe' })).toThrow(
      /Unknown config key/,
    );
  });

  it('should reject malformed --set format', () => {
    expect(() => execSync(`${CLI} config "${tmpDir}" --set badformat`, { stdio: 'pipe' })).toThrow(
      /Invalid --set format/,
    );
  });

  it('should reject invalid vault path', () => {
    expect(() => execSync(`${CLI} config /nonexistent/path`, { stdio: 'pipe' })).toThrow();
  });
});
