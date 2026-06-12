import { Database } from 'sql.js';
import { getAlgorithm } from './registry';
import {
  insertScheduling,
  getSchedulingForNote,
} from '../models/scheduling';
import type { SchedulingRow } from '../models/scheduling';
import type { SchedulingState, SchedulingResult } from './types';
import { todayISO, addDays } from '../utils/date';

function rowToState(row: SchedulingRow): SchedulingState {
  return {
    box: row.box,
    repetitions: row.repetitions,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    archived: row.archived === 1,
    stability: row.stability,
    difficulty: row.difficulty,
    lastReviewDate: row.last_reviewed,
  };
}

function resultToRow(result: SchedulingResult, noteId: string, reviewedAt: string, algorithm: string): SchedulingRow {
  return {
    note_id: noteId,
    ease_factor: result.easeFactor,
    repetitions: result.repetitions,
    interval_days: result.intervalDays,
    due_date: result.dueDate || addDays(reviewedAt, result.intervalDays),
    last_reviewed: reviewedAt,
    box: result.box,
    archived: result.archived ? 1 : 0,
    suspended: 0,
    algorithm,
    stability: result.stability,
    difficulty: result.difficulty,
  };
}

/**
 * Creates an initial scheduling record for a note if one doesn't exist.
 * @param db - SQLite database instance
 * @param noteId - The note ID
 * @param algo - Optional algorithm name (defaults to config default)
 */
export function initializeScheduling(db: Database, noteId: string, algo?: string): void {
  const existing = getSchedulingForNote(db, noteId);
  if (existing) return;

  const algorithm = algo ?? 'leitner';
  const algoImpl = getAlgorithm(algorithm);
  const state = algoImpl.initialState();

  const dueDate = todayISO();

  insertScheduling(db, {
    note_id: noteId,
    ease_factor: state.easeFactor,
    repetitions: state.repetitions,
    interval_days: state.intervalDays,
    due_date: dueDate,
    last_reviewed: null,
    box: state.box,
    archived: state.archived ? 1 : 0,
    suspended: 0,
    algorithm,
    stability: state.stability,
    difficulty: state.difficulty,
  });
}

/**
 * Applies a review quality rating, computes the new scheduling state, and persists it.
 * The card's stored algorithm is preserved even when an override is used for computation.
 * @param db - SQLite database instance
 * @param noteId - The note ID
 * @param quality - Quality rating (0-5)
 * @param reviewedAt - ISO date string of the review
 * @param algorithmOverride - Optional algorithm to use for computation only
 * @returns The updated SchedulingRow
 */
export function applyReview(
  db: Database,
  noteId: string,
  quality: number,
  reviewedAt: string,
  algorithmOverride?: string,
): SchedulingRow {
  const current = getSchedulingForNote(db, noteId);
  if (!current) {
    throw new Error(`No scheduling record found for note: ${noteId}`);
  }

  // Use the override for computation, but preserve the card's stored algorithm
  const algorithm = algorithmOverride ?? current.algorithm ?? 'leitner';
  const algoImpl = getAlgorithm(algorithm);
  const state = rowToState(current);

  // If the card was created with Leitner (ease_factor=0) but we're running
  // a different algorithm, seed sensible defaults so the first SM-2/FSRS
  // interval calculation doesn't collapse to zero.
  if (state.easeFactor === 0 && algorithm !== 'leitner') {
    state.easeFactor = 2.5;
  }

  const result = algoImpl.schedule(quality, state, reviewedAt);

  // Persist with the card's original algorithm, not the override
  const updated = resultToRow(result, noteId, reviewedAt, current.algorithm ?? 'leitner');
  insertScheduling(db, updated);
  return updated;
}
