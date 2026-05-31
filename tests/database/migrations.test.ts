import Database from 'better-sqlite3';
import { runMigrations } from '../../src/database/migrations';
import * as m001 from '../../src/database/migrations/001_notes.sql';
import * as m002 from '../../src/database/migrations/002_reviews.sql';
import * as m003 from '../../src/database/migrations/003_scheduling.sql';

describe('migration runner', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  const migrations = [
    { id: m001.id, name: m001.name, sql: m001.sql },
    { id: m002.id, name: m002.name, sql: m002.sql },
    { id: m003.id, name: m003.name, sql: m003.sql },
  ];

  it('should create all tables when run on fresh database', () => {
    runMigrations(db, migrations);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toContain('notes');
    expect(tableNames).toContain('reviews');
    expect(tableNames).toContain('scheduling');
    expect(tableNames).toContain('_migrations');
  });

  it('should record applied migrations', () => {
    runMigrations(db, migrations);

    const applied = db
      .prepare('SELECT id, name FROM _migrations ORDER BY id')
      .all() as { id: number; name: string }[];

    expect(applied).toHaveLength(3);
    expect(applied[0]).toEqual({ id: 1, name: 'create_notes' });
    expect(applied[1]).toEqual({ id: 2, name: 'create_reviews' });
    expect(applied[2]).toEqual({ id: 3, name: 'create_scheduling' });
  });

  it('should be idempotent — no errors on re-run', () => {
    runMigrations(db, migrations);
    expect(() => runMigrations(db, migrations)).not.toThrow();

    const applied = db
      .prepare('SELECT COUNT(*) as count FROM _migrations')
      .get() as { count: number };

    expect(applied.count).toBe(3);
  });
});
