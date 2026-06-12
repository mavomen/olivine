import { Database } from 'sql.js';
import { runMigrations } from './migrations';
import * as m001 from './migrations/001_notes.sql';
import * as m002 from './migrations/002_reviews.sql';
import * as m003 from './migrations/003_scheduling.sql';
import * as m004 from './migrations/004_leitner.sql';
import * as m005 from './migrations/005_tags.sql';
import * as m006 from './migrations/006_algorithm.sql';
import * as m007 from './migrations/007_fsrs_params.sql';
import * as m008 from './migrations/008_suspend.sql';

const migrations = [
  { id: m001.id, name: m001.name, sql: m001.sql },
  { id: m002.id, name: m002.name, sql: m002.sql },
  { id: m003.id, name: m003.name, sql: m003.sql },
  { id: m004.id, name: m004.name, sql: m004.sql },
  { id: m005.id, name: m005.name, sql: m005.sql },
  { id: m006.id, name: m006.name, sql: m006.sql },
  { id: m007.id, name: m007.name, sql: m007.sql },
  { id: m008.id, name: m008.name, sql: m008.sql },
];

/** Run all registered migrations to bring the database schema up to date. */
export function bootstrapDatabase(db: Database): void {
  runMigrations(db, migrations);
}
