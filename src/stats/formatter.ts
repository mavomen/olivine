import { Database } from 'sql.js';
import { totalNotes, dueNotesCount, reviewedToday, boxDistribution, archivedCount, totalReviews, streak } from './calculator';
import { todayISO } from '../utils/date';

/** A snapshot of review statistics at a point in time. */
export interface StatsSnapshot {
  totalNotes: number;
  dueNotes: number;
  reviewedToday: number;
  boxDistribution: Record<number, number>;
  archivedCount: number;
  totalReviews: number;
  streak: number;
}

/**
 * Gathers a snapshot of review statistics from the database.
 * @param db - SQLite database instance
 * @param tag - Optional tag to filter by
 * @returns A StatsSnapshot
 */
export function getStats(db: Database, tag?: string): StatsSnapshot {
  const today = todayISO();
  return {
    totalNotes: totalNotes(db, tag),
    dueNotes: dueNotesCount(db, today, tag),
    reviewedToday: reviewedToday(db, today),
    boxDistribution: boxDistribution(db, tag),
    archivedCount: archivedCount(db, tag),
    totalReviews: totalReviews(db),
    streak: streak(db, today),
  };
}

/**
 * Formats a StatsSnapshot into a human-readable string.
 * @param stats - The stats snapshot to format
 * @returns Formatted string for display
 */
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
