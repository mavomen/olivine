import { Database } from 'sql.js';

export interface SchedulingRow {
  note_id: string;
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
  last_reviewed: string | null;
  box: number;
  archived: number;
  algorithm: string;
  stability: number;
  difficulty: number;
}

export function insertScheduling(db: Database, row: SchedulingRow): void {
  db.run(
    `INSERT OR REPLACE INTO scheduling (note_id, ease_factor, repetitions, interval_days, due_date, last_reviewed, box, archived, algorithm, stability, difficulty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [row.note_id, row.ease_factor, row.repetitions, row.interval_days, row.due_date, row.last_reviewed, row.box, row.archived, row.algorithm, row.stability, row.difficulty],
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
  return getAllSchedulingRows(db, 'SELECT * FROM scheduling WHERE due_date <= ? AND archived = 0 ORDER BY due_date ASC LIMIT ?', [today, limit]);
}

export function getDueNotesByTag(db: Database, today: string, tag: string, limit: number): SchedulingRow[] {
  return getAllSchedulingRows(
    db,
    `SELECT s.* FROM scheduling s
     JOIN notes n ON s.note_id = n.id
     WHERE s.due_date <= ? AND s.archived = 0 AND n.tags LIKE '%' || ? || '%'
     ORDER BY s.due_date ASC LIMIT ?`,
    [today, tag, limit]
  );
}

export function deleteScheduling(db: Database, noteId: string): void {
  db.run('DELETE FROM scheduling WHERE note_id = ?', [noteId]);
}
