import { Database } from 'sql.js';
import { getAllNotes } from '../models/note';
import { getAllScheduling, getDueNotes } from '../models/scheduling';
import { getReviewCountToday, getTotalReviewCount } from '../models/review';
import { todayISO } from '../utils/date';

export function totalNotes(db: Database): number {
  return getAllNotes(db).length;
}

export function dueNotesCount(db: Database, today: string): number {
  return getDueNotes(db, today, Number.MAX_SAFE_INTEGER).length;
}

export function reviewedToday(db: Database, today: string): number {
  return getReviewCountToday(db, today);
}

export function averageEaseFactor(db: Database): number {
  const all = getAllScheduling(db);
  if (all.length === 0) return 0;
  const sum = all.reduce((acc, s) => acc + s.ease_factor, 0);
  return Math.round((sum / all.length) * 100) / 100;
}

export function totalReviews(db: Database): number {
  return getTotalReviewCount(db);
}

export function streak(db: Database, today: string): number {
  // Count consecutive days with at least one review, counting back from today.
  // We fetch all distinct review dates and iterate backwards.
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
      // Today has no review, but yesterday did - start streak from yesterday
      streakCount++;
      expected = new Date(dateStr);
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streakCount;
}
