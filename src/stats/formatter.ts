import { Database } from 'sql.js';
import { totalNotes, dueNotesCount, reviewedToday, averageEaseFactor, totalReviews, streak } from './calculator';
import { todayISO } from '../utils/date';

export interface StatsSnapshot {
  totalNotes: number;
  dueNotes: number;
  reviewedToday: number;
  averageEaseFactor: number;
  totalReviews: number;
  streak: number;
}

export function getStats(db: Database): StatsSnapshot {
  const today = todayISO();
  return {
    totalNotes: totalNotes(db),
    dueNotes: dueNotesCount(db, today),
    reviewedToday: reviewedToday(db, today),
    averageEaseFactor: averageEaseFactor(db),
    totalReviews: totalReviews(db),
    streak: streak(db, today),
  };
}

export function formatStats(stats: StatsSnapshot): string {
  return [
    `Total notes:          ${stats.totalNotes}`,
    `Due notes:            ${stats.dueNotes}`,
    `Reviewed today:       ${stats.reviewedToday}`,
    `Average ease factor:  ${stats.averageEaseFactor}`,
    `Total reviews:        ${stats.totalReviews}`,
    `Current streak:       ${stats.streak} day(s)`,
  ].join('\n');
}
