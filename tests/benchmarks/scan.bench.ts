import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('benchmark: scan', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-bench-scan-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should scan 100 files quickly', async () => {
    // Generate 100 markdown files
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(fs.writeFile(path.join(tmpDir, `note-${i}.md`), `# Note ${i}\n\nContent for note ${i}`));
    }
    await Promise.all(promises);

    const start = Date.now();
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });
    const elapsed = Date.now() - start;

    console.log(`\n  Scan 100 files: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should scan 500 files quickly', async () => {
    const promises = [];
    for (let i = 0; i < 500; i++) {
      promises.push(fs.writeFile(path.join(tmpDir, `note-${i}.md`), `# Note ${i}\n\nContent for note ${i}`));
    }
    await Promise.all(promises);

    const start = Date.now();
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });
    const elapsed = Date.now() - start;

    console.log(`\n  Scan 500 files: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(15000);
  });
});
