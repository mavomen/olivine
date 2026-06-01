import { Database } from 'sql.js';
import { totalNotes, dueNotesCount, reviewedToday, boxDistribution, archivedCount, totalReviews, streak } from './calculator';
import { todayISO } from '../utils/date';

export interface StatsSnapshot {
  totalNotes: number;
  dueNotes: number;
  reviewedToday: number;
  boxDistribution: Record<number, number>;
  archivedCount: number;
  totalReviews: number;
  streak: number;
}

export function getStats(db: Database): StatsSnapshot {
  const today = todayISO();
  return {
    totalNotes: totalNotes(db),
    dueNotes: dueNotesCount(db, today),
    reviewedToday: reviewedToday(db, today),
    boxDistribution: boxDistribution(db),
    archivedCount: archivedCount(db),
    totalReviews: totalReviews(db),
    streak: streak(db, today),
  };
}

export function formatStats(stats: StatsSnapshot): string {
  const boxLines = Object.entries(stats.boxDistribution)
    .map(([box, count]) => `  Box ${box}: ${count} card(s)`)
    .join('\n');

  return [
    `Total notes:          ${stats.totalNotes}`,
    `Due notes:            ${stats.dueNotes}`,
    `Reviewed today:       ${stats.reviewedToday}`,
    `Total reviews:        ${stats.totalReviews}`,
    `Current streak:       ${stats.streak} day(s)`,
    `Archived:             ${stats.archivedCount}`,
    '',
    'Box distribution:',
    boxLines,
  ].join('\n');
}
