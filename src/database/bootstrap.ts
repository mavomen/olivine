import Database from 'better-sqlite3';
import { runMigrations } from './migrations';
import * as m001 from './migrations/001_notes.sql';
import * as m002 from './migrations/002_reviews.sql';
import * as m003 from './migrations/003_scheduling.sql';

const migrations = [
  { id: m001.id, name: m001.name, sql: m001.sql },
  { id: m002.id, name: m002.name, sql: m002.sql },
  { id: m003.id, name: m003.name, sql: m003.sql },
];

export function bootstrapDatabase(db: Database.Database): void {
  runMigrations(db, migrations);
}
