import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { syncVault } from '../../src/sync/service';
import { getAllNotes } from '../../src/models/note';

describe('sync service', () => {
  let tmpDir: string;
  let db: any;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-sync-test-'));
    db = await createMemoryDb();
    bootstrapDatabase(db);
  });

  afterEach(async () => {
    db.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should sync newly added markdown files', async () => {
    await fs.writeFile(path.join(tmpDir, 'note1.md'), '# First Note');
    await fs.writeFile(path.join(tmpDir, 'note2.md'), '---\ntitle: Second\n---\nContent.');

    const { added } = await syncVault(tmpDir, db);
    expect(added).toBe(2);

    const notes = getAllNotes(db);
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.title).sort()).toEqual(['First Note', 'Second']);
  });

  it('should update existing notes on re-sync', async () => {
    await fs.writeFile(path.join(tmpDir, 'note.md'), 'Original');
    await syncVault(tmpDir, db);

    await fs.writeFile(path.join(tmpDir, 'note.md'), 'Updated Content');
    await syncVault(tmpDir, db);

    const notes = getAllNotes(db);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.content).toContain('Updated Content');
  });
});
