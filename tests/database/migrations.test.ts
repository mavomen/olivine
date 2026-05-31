import { createMemoryDb } from '../test-utils';
import { runMigrations } from '../../src/database/migrations';
import * as m001 from '../../src/database/migrations/001_notes.sql';
import * as m002 from '../../src/database/migrations/002_reviews.sql';
import * as m003 from '../../src/database/migrations/003_scheduling.sql';

describe('migration runner', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
  });

  afterEach(() => {
    db.close();
  });

  const migrations = [
    { id: m001.id, name: m001.name, sql: m001.sql },
    { id: m002.id, name: m002.name, sql: m002.sql },
    { id: m003.id, name: m003.name, sql: m003.sql },
  ];

  function getTableNames(): string[] {
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    if (res.length === 0) return [];
    return res[0].values.map((row: any) => row[0]);
  }

  it('should create all tables when run on fresh database', () => {
    runMigrations(db, migrations);
    const names = getTableNames();
    expect(names).toContain('notes');
    expect(names).toContain('reviews');
    expect(names).toContain('scheduling');
    expect(names).toContain('_migrations');
  });

  it('should record applied migrations', () => {
    runMigrations(db, migrations);
    const res = db.exec('SELECT id, name FROM _migrations ORDER BY id');
    const rows = res[0].values;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual([1, 'create_notes']);
    expect(rows[1]).toEqual([2, 'create_reviews']);
    expect(rows[2]).toEqual([3, 'create_scheduling']);
  });

  it('should be idempotent', () => {
    runMigrations(db, migrations);
    expect(() => runMigrations(db, migrations)).not.toThrow();
    const res = db.exec('SELECT COUNT(*) as count FROM _migrations');
    expect(res[0].values[0][0]).toBe(3);
  });
});
