import initSqlJs, { Database as SQLJsDatabase, SqlJsStatic } from 'sql.js';
import * as fs from 'node:fs';
import path from 'node:path';
import { OLIVINE_DIR, DATABASE_FILENAME } from '../config/constants';

let SQL: SqlJsStatic | null = null;
let db: SQLJsDatabase | null = null;

async function getSql(): Promise<SqlJsStatic> {
  if (!SQL) SQL = await initSqlJs();
  return SQL;
}

export async function getDb(vaultPath: string): Promise<SQLJsDatabase> {
  if (!db) {
    const sql = await getSql();
    const dirPath = path.join(vaultPath, OLIVINE_DIR);
    const dbPath = path.join(dirPath, DATABASE_FILENAME);

    await fs.promises.mkdir(dirPath, { recursive: true });

    if (fs.existsSync(dbPath)) {
      const buffer = await fs.promises.readFile(dbPath);
      db = new sql.Database(buffer);
    } else {
      db = new sql.Database();
    }

    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    saveDb(vaultPath); // immediate persist for WAL
  }
  return db;
}

export function saveDb(vaultPath: string): void {
  if (!db) return;
  const dbPath = path.join(vaultPath, OLIVINE_DIR, DATABASE_FILENAME);
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function setDb(override: SQLJsDatabase): void {
  db = override;
}
