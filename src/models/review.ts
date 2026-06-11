import { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';

export interface ReviewRow {
  id: string;
  note_id: string;
  quality: number;
  reviewed_at: string;
}

export function insertReview(db: Database, noteId: string, quality: number, reviewedAt: string): ReviewRow {
  const id = uuidv4();
  db.run('INSERT INTO reviews (id, note_id, quality, reviewed_at) VALUES (?, ?, ?, ?)', [
    id,
    noteId,
    quality,
    reviewedAt,
  ]);
  return { id, note_id: noteId, quality, reviewed_at: reviewedAt };
}

function queryReviews(db: Database, sql: string, params: unknown[]): ReviewRow[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: ReviewRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as ReviewRow);
  }
  stmt.free();
  return rows;
}

export function getReviewsForNote(db: Database, noteId: string): ReviewRow[] {
  return queryReviews(db, 'SELECT * FROM reviews WHERE note_id = ? ORDER BY reviewed_at DESC', [noteId]);
}

export function getReviewCountToday(db: Database, today: string): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE reviewed_at = ?');
  stmt.bind([today]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { count: number };
    stmt.free();
    return row.count;
  }
  stmt.free();
  return 0;
}

export function getTotalReviewCount(db: Database): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM reviews');
  if (stmt.step()) {
    const row = stmt.getAsObject() as { count: number };
    stmt.free();
    return row.count;
  }
  stmt.free();
  return 0;
}

export function getAllReviews(db: Database): ReviewRow[] {
  return queryReviews(db, 'SELECT * FROM reviews ORDER BY reviewed_at ASC', []);
}

export function insertReviewWithId(db: Database, id: string, noteId: string, quality: number, reviewedAt: string): ReviewRow {
  db.run('INSERT OR REPLACE INTO reviews (id, note_id, quality, reviewed_at) VALUES (?, ?, ?, ?)', [
    id,
    noteId,
    quality,
    reviewedAt,
  ]);
  return { id, note_id: noteId, quality, reviewed_at: reviewedAt };
}

export function deleteReviewsForNote(db: Database, noteId: string): void {
  db.run('DELETE FROM reviews WHERE note_id = ?', [noteId]);
}
