import { Database } from 'sql.js';

export interface SchedulingRow {
  note_id: string;
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
  last_reviewed: string | null;
}

export function insertScheduling(db: Database, row: SchedulingRow): void {
  db.run(
    `INSERT OR REPLACE INTO scheduling (note_id, ease_factor, repetitions, interval_days, due_date, last_reviewed)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [row.note_id, row.ease_factor, row.repetitions, row.interval_days, row.due_date, row.last_reviewed],
  );
}

function getOneScheduling(db: Database, sql: string, params: unknown[]): SchedulingRow | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as SchedulingRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return undefined;
}

function getAllSchedulingRows(db: Database, sql: string, params: unknown[] = []): SchedulingRow[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: SchedulingRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as SchedulingRow);
  }
  stmt.free();
  return rows;
}

export function getSchedulingForNote(db: Database, noteId: string): SchedulingRow | undefined {
  return getOneScheduling(db, 'SELECT * FROM scheduling WHERE note_id = ?', [noteId]);
}

export function getAllScheduling(db: Database): SchedulingRow[] {
  return getAllSchedulingRows(db, 'SELECT * FROM scheduling');
}

export function getDueNotes(db: Database, today: string, limit: number): SchedulingRow[] {
  return getAllSchedulingRows(db, 'SELECT * FROM scheduling WHERE due_date <= ? ORDER BY due_date ASC LIMIT ?', [
    today,
    limit,
  ]);
}

export function deleteScheduling(db: Database, noteId: string): void {
  db.run('DELETE FROM scheduling WHERE note_id = ?', [noteId]);
}
