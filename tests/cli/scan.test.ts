import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('scan command', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-scan-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should scan vault and detect markdown files', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# First Note');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '# Second Note');

    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/2 notes added/);
  });

  it('should handle empty vault gracefully', async () => {
    const output = execSync(`${CLI} scan "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toMatch(/0 notes added/);
  });
});
