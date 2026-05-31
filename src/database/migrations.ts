import { Database } from 'sql.js';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

export function runMigrations(db: Database, migrations: Migration[]): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const result = db.exec('SELECT id FROM _migrations');
  const applied = new Set<number>();
  if (result.length > 0) {
    const rows = result[0]!.values;
    for (const row of rows) {
      applied.add(row[0] as number);
    }
  }

  const pending = migrations.filter((m) => !applied.has(m.id));
  if (pending.length === 0) return;

  for (const migration of pending) {
    db.run(migration.sql);
    db.run('INSERT INTO _migrations (id, name) VALUES (?, ?)', [migration.id, migration.name]);
  }
}
