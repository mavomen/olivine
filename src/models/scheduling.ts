import Database from 'better-sqlite3';

export interface SchedulingRow {
  note_id: string;
  ease_factor: number;
  repetitions: number;
  interval_days: number;
  due_date: string;
  last_reviewed: string | null;
}

export function insertScheduling(db: Database.Database, row: SchedulingRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO scheduling (note_id, ease_factor, repetitions, interval_days, due_date, last_reviewed)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(row.note_id, row.ease_factor, row.repetitions, row.interval_days, row.due_date, row.last_reviewed);
}

export function getSchedulingForNote(db: Database.Database, noteId: string): SchedulingRow | undefined {
  return db.prepare('SELECT * FROM scheduling WHERE note_id = ?').get(noteId) as SchedulingRow | undefined;
}

export function getAllScheduling(db: Database.Database): SchedulingRow[] {
  return db.prepare('SELECT * FROM scheduling').all() as SchedulingRow[];
}

export function getDueNotes(db: Database.Database, today: string, limit: number): SchedulingRow[] {
  return db
    .prepare('SELECT * FROM scheduling WHERE due_date <= ? ORDER BY due_date ASC LIMIT ?')
    .all(today, limit) as SchedulingRow[];
}

export function deleteScheduling(db: Database.Database, noteId: string): void {
  db.prepare('DELETE FROM scheduling WHERE note_id = ?').run(noteId);
}
