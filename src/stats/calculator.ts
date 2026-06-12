import { Database } from 'sql.js';
import { getAllNotes, getNoteIdsByTag } from '../models/note';
import { getDueNotes } from '../models/scheduling';
import { getReviewCountToday, getTotalReviewCount } from '../models/review';

export function totalNotes(db: Database, tag?: string): number {
  if (tag) return getNoteIdsByTag(db, tag).size;
  return getAllNotes(db).length;
}

export function dueNotesCount(db: Database, today: string, tag?: string): number {
  const due = getDueNotes(db, today, Number.MAX_SAFE_INTEGER);
  if (tag) {
    const ids = getNoteIdsByTag(db, tag);
    return due.filter(s => ids.has(s.note_id)).length;
  }
  return due.length;
}

export function reviewedToday(db: Database, today: string): number {
  return getReviewCountToday(db, today);
}

export function boxDistribution(db: Database, tag?: string): Record<number, number> {
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  let sql: string;
  let params: unknown[];
  if (tag) {
    sql = `SELECT s.box, COUNT(*) as count FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 0 AND s.suspended = 0 AND n.tags LIKE '%' || ? || '%'
           GROUP BY s.box ORDER BY s.box`;
    params = [tag];
  } else {
    sql = 'SELECT box, COUNT(*) as count FROM scheduling WHERE archived = 0 AND suspended = 0 GROUP BY box ORDER BY box';
    params = [];
  }

  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    const row = stmt.getAsObject() as { box: number; count: number };
    dist[row.box] = row.count;
  }
  stmt.free();
  return dist;
}

export function archivedCount(db: Database, tag?: string): number {
  let sql: string;
  let params: unknown[];
  if (tag) {
    sql = `SELECT COUNT(*) as count FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 1 AND n.tags LIKE '%' || ? || '%'`;
    params = [tag];
  } else {
    sql = 'SELECT COUNT(*) as count FROM scheduling WHERE archived = 1';
    params = [];
  }
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject() as { count: number };
    stmt.free();
    return row.count;
  }
  stmt.free();
  return 0;
}

export function totalReviews(db: Database): number {
  return getTotalReviewCount(db);
}

export function streak(db: Database, today: string): number {
  const result = db.exec('SELECT DISTINCT reviewed_at FROM reviews ORDER BY reviewed_at DESC');
  if (result.length === 0) return 0;
  
  const dates = result[0]!.values.map(row => row[0] as string);
  let streakCount = 0;
  let expected = new Date(today);
  
  for (const dateStr of dates) {
    const date = new Date(dateStr);
    const diff = Math.floor((expected.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) {
      streakCount++;
      expected.setDate(expected.getDate() - 1);
    } else if (diff === 1 && streakCount === 0) {
      streakCount++;
      expected = new Date(dateStr);
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streakCount;
}
