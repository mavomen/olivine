import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewRow {
  id: string;
  note_id: string;
  quality: number;
  reviewed_at: string;
}

export function insertReview(db: Database.Database, noteId: string, quality: number, reviewedAt: string): ReviewRow {
  const id = uuidv4();
  db.prepare(
    `INSERT INTO reviews (id, note_id, quality, reviewed_at) VALUES (?, ?, ?, ?)`
  ).run(id, noteId, quality, reviewedAt);
  return { id, note_id: noteId, quality, reviewed_at: reviewedAt };
}

export function getReviewsForNote(db: Database.Database, noteId: string): ReviewRow[] {
  return db.prepare('SELECT * FROM reviews WHERE note_id = ? ORDER BY reviewed_at DESC').all(noteId) as ReviewRow[];
}

export function getReviewCountToday(db: Database.Database, today: string): number {
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM reviews WHERE reviewed_at = ?'
  ).get(today) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function getTotalReviewCount(db: Database.Database): number {
  const row = db.prepare('SELECT COUNT(*) as count FROM reviews').get() as { count: number } | undefined;
  return row?.count ?? 0;
}
