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
  let sql = 'SELECT box, COUNT(*) as count FROM scheduling WHERE archived = 0';
  if (tag) {
    sql = `SELECT box, COUNT(*) as count FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 0 AND n.tags LIKE '%' || '${tag}' || '%'
           GROUP BY box ORDER BY box`;
  } else {
    sql += ' GROUP BY box ORDER BY box';
  }
  const result = db.exec(sql);
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  if (result.length > 0) {
    for (const row of result[0]!.values) {
      dist[row[0] as number] = row[1] as number;
    }
  }
  return dist;
}

export function archivedCount(db: Database, tag?: string): number {
  let sql = 'SELECT COUNT(*) as count FROM scheduling WHERE archived = 1';
  if (tag) {
    sql = `SELECT COUNT(*) as count FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 1 AND n.tags LIKE '%' || '${tag}' || '%'`;
  }
  const row = db.exec(sql);
  if (row.length > 0) {
    return row[0]!.values[0]![0] as number;
  }
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
