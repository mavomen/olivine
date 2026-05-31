import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { syncVault } from '../../src/sync/service';
import { getAllNotes } from '../../src/models/note';

describe('sync cleanup', () => {
  let tmpDir: string;
  let db: any;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-cleanup-test-'));
    db = await createMemoryDb();
    bootstrapDatabase(db);
  });

  afterEach(async () => {
    db.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should remove notes from database when file is deleted', async () => {
    const notePath = path.join(tmpDir, 'note.md');
    await fs.writeFile(notePath, '# Temporary Note');
    await syncVault(tmpDir, db);

    expect(getAllNotes(db)).toHaveLength(1);

    await fs.unlink(notePath);
    const { removed } = await syncVault(tmpDir, db);
    expect(removed).toBe(1);
    expect(getAllNotes(db)).toHaveLength(0);
  });

  it('should handle mix of additions and deletions', async () => {
    const keepPath = path.join(tmpDir, 'keep.md');
    const removePath = path.join(tmpDir, 'remove.md');
    await fs.writeFile(keepPath, '# Keep');
    await fs.writeFile(removePath, '# Remove');
    await syncVault(tmpDir, db);

    await fs.unlink(removePath);
    await fs.writeFile(path.join(tmpDir, 'new.md'), '# New');

    const { added, removed } = await syncVault(tmpDir, db);
    expect(added).toBe(1);
    expect(removed).toBe(1);
    const notes = getAllNotes(db);
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.title).sort()).toEqual(['Keep', 'New']);
  });
});
