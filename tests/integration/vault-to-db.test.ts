import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import initSqlJs from 'sql.js';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { syncVault } from '../../src/sync/service';
import { getAllNotes, getNoteByPath } from '../../src/models/note';
import { ensureOlivineDir } from '../../src/config/initializer';

describe('vault-to-db integration', () => {
  let vaultPath: string;
  let SQL: any;

  beforeAll(async () => {
    SQL = await initSqlJs();
  });

  beforeEach(async () => {
    vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), 'olivine-integration-'));
    await ensureOlivineDir(vaultPath);
  });

  afterEach(async () => {
    await fs.rm(vaultPath, { recursive: true, force: true });
  });

  function loadDb(): any {
    const dbPath = path.join(vaultPath, '.olivine', 'olivine.db');
    if (require('fs').existsSync(dbPath)) {
      const buffer = require('fs').readFileSync(dbPath);
      return new SQL.Database(buffer);
    }
    return new SQL.Database();
  }

  it('should synchronize markdown files into SQLite', async () => {
    await fs.writeFile(
      path.join(vaultPath, 'alpha.md'),
      '---\ntitle: Alpha\n---\nContent of alpha.',
    );
    await fs.writeFile(path.join(vaultPath, 'beta.md'), '# Beta\n\nBeta content.');

    const db = loadDb();
    bootstrapDatabase(db);
    await syncVault(vaultPath, db);

    const notes = getAllNotes(db);
    expect(notes).toHaveLength(2);

    const alpha = getNoteByPath(db, 'alpha.md');
    expect(alpha).toBeTruthy();
    expect(alpha!.title).toBe('Alpha');
    expect(alpha!.word_count).toBe(3);

    const beta = getNoteByPath(db, 'beta.md');
    expect(beta).toBeTruthy();
    expect(beta!.title).toBe('Beta');
  });

  it('should persist data across connections', async () => {
    await fs.writeFile(path.join(vaultPath, 'note.md'), '# Persistent');
    let db = loadDb();
    bootstrapDatabase(db);
    await syncVault(vaultPath, db);
    const data = db.export();
    require('fs').writeFileSync(path.join(vaultPath, '.olivine', 'olivine.db'), Buffer.from(data));
    db.close();

    db = loadDb();
    const notes = getAllNotes(db);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.title).toBe('Persistent');
  });
});
