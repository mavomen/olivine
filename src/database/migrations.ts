import Database from 'better-sqlite3';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

export function runMigrations(db: Database.Database, migrations: Migration[]): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare('SELECT id FROM _migrations')
      .all()
      .map((row: unknown) => (row as { id: number }).id),
  );

  const pending = migrations.filter((m) => !applied.has(m.id));
  if (pending.length === 0) return;

  const insert = db.prepare('INSERT INTO _migrations (id, name) VALUES (?, ?)');
  const runAll = db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
      insert.run(migration.id, migration.name);
    }
  });

  runAll();
}
