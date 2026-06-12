import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CLI = `node ${path.join(PROJECT_ROOT, 'dist/index.js')}`;

describe('tag command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-tag-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should report no tags when vault is empty', () => {
    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('No tags found.');
  });

  it('should list tags with counts', async () => {
    await fs.writeFile(path.join(tmpDir, 'math.md'), '---\ntags: [math]\n---\n# Math Note\nContent');
    await fs.writeFile(path.join(tmpDir, 'cs.md'), '---\ntags: [cs]\n---\n# CS Note\nContent');
    await fs.writeFile(path.join(tmpDir, 'math2.md'), '---\ntags: [math]\n---\n# Math Note 2\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('math');
    expect(output).toContain('cs');
    expect(output).toContain('2 cards');
    expect(output).toContain('1 card');
  });

  it('should list tags sorted by frequency descending', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.md'), '---\ntags: [alpha]\n---\n# A\nContent');
    await fs.writeFile(path.join(tmpDir, 'b.md'), '---\ntags: [beta]\n---\n# B\nContent');
    await fs.writeFile(path.join(tmpDir, 'c.md'), '---\ntags: [alpha]\n---\n# C\nContent');
    await fs.writeFile(path.join(tmpDir, 'd.md'), '---\ntags: [beta]\n---\n# D\nContent');
    await fs.writeFile(path.join(tmpDir, 'e.md'), '---\ntags: [alpha]\n---\n# E\nContent');
    await fs.writeFile(path.join(tmpDir, 'f.md'), '---\ntags: [gamma]\n---\n# F\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    const lines = output.split('\n').filter(l => l.startsWith('  '));
    expect(lines.length).toBe(3);
    expect(lines[0]).toContain('alpha');
    expect(lines[1]).toContain('beta');
    expect(lines[2]).toContain('gamma');
  });

  it('should output valid JSON with --json flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'n.md'), '---\ntags: [alpha, beta]\n---\n# N\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}" --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty('totalNotes');
    expect(parsed).toHaveProperty('tags');
    expect(Array.isArray(parsed.tags)).toBe(true);
    expect(parsed.tags.length).toBe(2);
    expect(parsed.tags[0].tag).toBe('alpha');
    expect(parsed.tags[0].count).toBe(1);
  });

  it('should handle notes with multiple tags', async () => {
    await fs.writeFile(path.join(tmpDir, 'multi.md'), '---\ntags: [math, cs, physics]\n---\n# Multi\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('math');
    expect(output).toContain('cs');
    expect(output).toContain('physics');
  });

  it('should handle notes without tags', async () => {
    await fs.writeFile(path.join(tmpDir, 'untagged.md'), '# Untagged\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('No tags found.');
  });

  it('should list cards with a specific tag when tagname is provided', async () => {
    await fs.writeFile(path.join(tmpDir, 'm1.md'), '---\ntags: [math]\n---\n# Math 1\nContent');
    await fs.writeFile(path.join(tmpDir, 'm2.md'), '---\ntags: [math]\n---\n# Math 2\nContent');
    await fs.writeFile(path.join(tmpDir, 'c1.md'), '---\ntags: [cs]\n---\n# CS 1\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}" math`, { encoding: 'utf-8' });
    expect(output).toContain('Math 1');
    expect(output).toContain('Math 2');
    expect(output).not.toContain('CS 1');
  });

  it('should return empty when tagname matches no cards', async () => {
    await fs.writeFile(path.join(tmpDir, 'n.md'), '---\ntags: [math]\n---\n# N\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}" nonexistent`, { encoding: 'utf-8' });
    expect(output).toContain('No cards with tag');
  });

  it('should output JSON when tagname and --json are provided', async () => {
    await fs.writeFile(path.join(tmpDir, 'n.md'), '---\ntags: [math]\n---\n# N\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const output = execSync(`${CLI} tag "${tmpDir}" math --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed.tag).toBe('math');
    expect(parsed.notes.length).toBe(1);
    expect(parsed.notes[0].title).toBe('N');
  });

  it('should rename a tag with --rename flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.md'), '---\ntags: [math]\n---\n# A\nContent');
    await fs.writeFile(path.join(tmpDir, 'b.md'), '---\ntags: [math, cs]\n---\n# B\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const renameOut = execSync(`${CLI} tag "${tmpDir}" --rename math:mathematics`, { encoding: 'utf-8' });
    expect(renameOut).toContain('Renamed');

    const output = execSync(`${CLI} tag "${tmpDir}" --json`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    expect(parsed.tags.find((t: any) => t.tag === 'mathematics')).toBeDefined();
    expect(parsed.tags.find((t: any) => t.tag === 'math')).toBeUndefined();
  });

  it('should delete a tag with --delete flag', async () => {
    await fs.writeFile(path.join(tmpDir, 'a.md'), '---\ntags: [math]\n---\n# A\nContent');
    await fs.writeFile(path.join(tmpDir, 'b.md'), '---\ntags: [math, cs]\n---\n# B\nContent');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    const deleteOut = execSync(`${CLI} tag "${tmpDir}" --delete math`, { encoding: 'utf-8' });
    expect(deleteOut).toContain('Removed');

    const output = execSync(`${CLI} tag "${tmpDir}"`, { encoding: 'utf-8' });
    expect(output).toContain('cs');
    expect(output).not.toContain('math');
  });

  it('should error with --rename when no colon separator is used', () => {
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    expect(() =>
      execSync(`${CLI} tag "${tmpDir}" --rename badformat`, { stdio: 'pipe' }),
    ).toThrow();
  });
});
