import { Database } from 'sql.js';
import { getAllNotes } from '../models/note';
import { getDueNotes } from '../models/scheduling';
import { getReviewCountToday, getTotalReviewCount } from '../models/review';

export function totalNotes(db: Database): number {
  return getAllNotes(db).length;
}

export function dueNotesCount(db: Database, today: string): number {
  return getDueNotes(db, today, Number.MAX_SAFE_INTEGER).length;
}

export function reviewedToday(db: Database, today: string): number {
  return getReviewCountToday(db, today);
}

export function boxDistribution(db: Database): Record<number, number> {
  const result = db.exec(
    'SELECT box, COUNT(*) as count FROM scheduling WHERE archived = 0 GROUP BY box ORDER BY box'
  );
  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  if (result.length > 0) {
    for (const row of result[0]!.values) {
      dist[row[0] as number] = row[1] as number;
    }
  }
  return dist;
}

export function archivedCount(db: Database): number {
  const row = db.exec('SELECT COUNT(*) as count FROM scheduling WHERE archived = 1');
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
