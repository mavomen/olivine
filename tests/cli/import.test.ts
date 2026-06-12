import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const CLI = 'node dist/index.js';

describe('import command', () => {
  let tmpDir: string;
  let importFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-import-test-'));
    execSync(`${CLI} init "${tmpDir}"`, { stdio: 'pipe' });
    importFile = path.join(tmpDir, 'import.json');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should import notes from a valid JSON file', async () => {
    const data = {
      version: 1,
      exportedAt: '2026-06-11',
      notes: [
        {
          id: 'imported-note-1',
          path: 'imported.md',
          title: 'Imported Card',
          content: 'Imported content',
          word_count: 2,
          created_at: '2026-01-01',
          updated_at: '2026-06-11',
          tags: '["imported"]',
          scheduling: {
            note_id: 'imported-note-1',
            ease_factor: 2.5,
            repetitions: 0,
            interval_days: 1,
            due_date: '2026-06-11',
            last_reviewed: null,
            box: 1,
            archived: 0,
            algorithm: 'leitner',
            stability: 0,
            difficulty: 5,
          },
          reviews: [],
        },
      ],
    };
    await fs.writeFile(importFile, JSON.stringify(data), 'utf-8');

    const output = execSync(`${CLI} import "${tmpDir}" "${importFile}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('Imported 1 note(s) and 0 review(s).');
  });

  it('should import reviews along with notes', async () => {
    const data = {
      version: 1,
      exportedAt: '2026-06-11',
      notes: [
        {
          id: 'note-with-reviews',
          path: 'reviewed.md',
          title: 'Reviewed Card',
          content: 'Content',
          word_count: 1,
          created_at: '2026-01-01',
          updated_at: '2026-06-11',
          tags: '[]',
          scheduling: null,
          reviews: [
            { id: 'review-1', quality: 4, reviewed_at: '2026-06-10' },
            { id: 'review-2', quality: 3, reviewed_at: '2026-06-11' },
          ],
        },
      ],
    };
    await fs.writeFile(importFile, JSON.stringify(data), 'utf-8');

    const output = execSync(`${CLI} import "${tmpDir}" "${importFile}"`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    expect(output).toContain('Imported 1 note(s) and 2 review(s).');
  });

  it('should error on missing file', () => {
    expect(() => execSync(`${CLI} import "${tmpDir}" /nonexistent/file.json`, {
      stdio: 'pipe',
    })).toThrow();
  });

  it('should error on invalid JSON', async () => {
    await fs.writeFile(importFile, 'not json', 'utf-8');
    expect(() => execSync(`${CLI} import "${tmpDir}" "${importFile}"`, {
      stdio: 'pipe',
    })).toThrow();
  });

  it('should error on invalid vault path', async () => {
    await fs.writeFile(importFile, '{}', 'utf-8');
    expect(() => execSync(`${CLI} import /nonexistent "${importFile}"`, {
      stdio: 'pipe',
    })).toThrow();
  });

  it('should round-trip export → import → export', async () => {
    // Create a note and scan it
    await fs.writeFile(path.join(tmpDir, 'roundtrip.md'), '# Round Trip');
    execSync(`${CLI} scan "${tmpDir}"`, { stdio: 'pipe' });

    // Export
    const exportOut = path.join(tmpDir, 'roundtrip.json');
    execSync(`${CLI} export "${tmpDir}" --output "${exportOut}"`, { stdio: 'pipe' });

    // Import into a second vault
    const tmpDir2 = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-roundtrip-'));
    execSync(`${CLI} init "${tmpDir2}"`, { stdio: 'pipe' });
    execSync(`${CLI} import "${tmpDir2}" "${exportOut}"`, { stdio: 'pipe' });

    // Re-export from second vault
    const reExport = execSync(`${CLI} export "${tmpDir2}"`, { encoding: 'utf-8', stdio: 'pipe' });
    const data = JSON.parse(reExport);
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0].title).toBe('Round Trip');
    expect(data.notes[0].scheduling).toBeTruthy();

    await fs.rm(tmpDir2, { recursive: true, force: true });
  });
});
