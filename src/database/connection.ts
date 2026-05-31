import Database from 'better-sqlite3';
import path from 'node:path';
import { OLIVINE_DIR, DATABASE_FILENAME } from '../config/constants';

let db: Database.Database | null = null;

export function getDb(vaultPath: string): Database.Database {
  if (!db) {
    const dbPath = path.join(vaultPath, OLIVINE_DIR, DATABASE_FILENAME);
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function setDb(override: Database.Database): void {
  db = override;
}
