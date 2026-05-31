import initSqlJs, { Database } from 'sql.js';

let SQL: any = null;

export async function createMemoryDb(): Promise<Database> {
  if (!SQL) SQL = await initSqlJs();
  return new SQL.Database();
}
