import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('add command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-add-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should create a card with --title (question) and --content (answer) flags', () => {
    const output = execSync(
      `${CLI} add "${tmpDir}" --title "What is a monad?" --content "A monoid in the category of endofunctors."`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    expect(output).toContain('Card created:');
    expect(output).toContain('what-is-a-monad.md');
  });

  it('should fail without title and content in non-TTY', () => {
    expect(() =>
      execSync(`${CLI} add "${tmpDir}"`, { encoding: 'utf-8', stdio: 'pipe' }),
    ).toThrow();
  });

  it('should create a markdown file with question as title', async () => {
    execSync(`${CLI} add "${tmpDir}" --title "Test Question" --content "Answer body."`, {
      stdio: 'pipe',
    });
    const filePath = path.join(tmpDir, 'test-question.md');
    const fileExists = await fs.stat(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('title: Test Question');
    expect(content).toContain('Answer body.');
  });

  it('should sync new card to database', async () => {
    execSync(`${CLI} add "${tmpDir}" --title "DB Test" --content "Content."`, { stdio: 'pipe' });
    const output = execSync(`${CLI} due "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('1 note(s) due');
  });

  it('should create a safe slug from special characters in title', () => {
    const output = execSync(
      `${CLI} add "${tmpDir}" --title "What's the 'best' way? (maybe!)" --content "Content."`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    expect(output).toMatch(/what-s-the-best-way-maybe\.md/);
  });

  it('should truncate long titles to 64 characters for the filename', () => {
    const longTitle = 'a'.repeat(100);
    const output = execSync(
      `${CLI} add "${tmpDir}" --title "${longTitle}" --content "Content."`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );
    const match = output.match(/([a-z-]+)\.md/);
    expect(match).toBeTruthy();
    expect(match![1]!.length).toBeLessThanOrEqual(64);
  });

  it('should accept a --tags flag and persist tags to the database', () => {
    execSync(
      `${CLI} add "${tmpDir}" --title "Tagged Card" --content "Content." --tags "math, algebra"`,
      { stdio: 'pipe' },
    );
    const output = execSync(`${CLI} due "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('1 note(s) due');
  });
});
