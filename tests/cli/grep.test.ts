import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('grep command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-grep-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should find cards matching title pattern', async () => {
    await fs.writeFile(path.join(tmpDir, 'french.md'), '---\ntitle: French Greetings\n---\n\nBonjour and salut');
    await fs.writeFile(path.join(tmpDir, 'spanish.md'), '---\ntitle: Spanish Basics\n---\n\nHola and gracias');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} grep "${tmpDir}" French`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/1 card\(s\) matching/);
    expect(output).toContain('French Greetings');
  });

  it('should find cards matching content pattern', async () => {
    await fs.writeFile(path.join(tmpDir, 'weather.md'), '---\ntitle: Weather\n---\n\nRainy and cold today');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} grep "${tmpDir}" rainy`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/1 card\(s\) matching/);
    expect(output).toContain('Weather');
  });

  it('should return empty result for no matches', async () => {
    await fs.writeFile(path.join(tmpDir, 'math.md'), '---\ntitle: Math\n---\n\nAlgebra');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} grep "${tmpDir}" Biology`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('No cards matching');
  });

  it('should handle special regex characters in pattern', async () => {
    await fs.writeFile(path.join(tmpDir, 'code.md'), '---\ntitle: C++ Basics\n---\n\nC++ pointers');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} grep "${tmpDir}" "C++"`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toMatch(/1 card\(s\) matching/);
    expect(output).toContain('C++ Basics');
  });

  it('should display box number for scheduled cards', async () => {
    await fs.writeFile(path.join(tmpDir, 'hist.md'), '---\ntitle: History\n---\n\nAncient Rome');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} grep "${tmpDir}" History`, { encoding: 'utf-8', stdio: 'pipe' });
    expect(output).toContain('Box');
  });
});
