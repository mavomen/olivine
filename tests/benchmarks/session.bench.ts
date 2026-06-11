import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('benchmark: session generation', () => {
  let tmpDir: string;

  beforeAll(() => {
    execSync('npm run build', { stdio: 'ignore', cwd: path.resolve(__dirname, '../..') });
  });

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-bench-session-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should generate session for 50 due notes quickly', async () => {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(fs.writeFile(path.join(tmpDir, `note-${i}.md`), `# Note ${i}\n\nContent ${i}`));
    }
    await Promise.all(promises);
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    // Force all notes to be due (set due_date to yesterday)
    execSync(
      `sqlite3 "${tmpDir}/.olivine/olivine.db" "UPDATE scheduling SET due_date = date('now', '-1 day')"`,
      { stdio: 'pipe' },
    );

    const start = Date.now();
    const output = execSync(`${CLI} review "${tmpDir}" --tui --quality 4`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 30000,
    });
    const elapsed = Date.now() - start;

    console.log(`\n  Generate + review 50 notes: ${elapsed}ms`);
    expect(output).toBeDefined();
    expect(elapsed).toBeLessThan(30000);
  });
});
