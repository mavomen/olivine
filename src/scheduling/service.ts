import { Database } from 'sql.js';
import { sm2, SM2_DEFAULTS } from '../algorithms/sm2';
import {
  insertScheduling,
  getSchedulingForNote,
  deleteScheduling,
} from '../models/scheduling';
import type { SchedulingRow } from '../models/scheduling';
import { todayISO, addDays } from '../utils/date';

export function initializeScheduling(db: Database, noteId: string): void {
  const existing = getSchedulingForNote(db, noteId);
  if (existing) return;

  const dueDate = todayISO();
  insertScheduling(db, {
    note_id: noteId,
    ease_factor: SM2_DEFAULTS.INITIAL_EASE_FACTOR,
    repetitions: 0,
    interval_days: 0,
    due_date: dueDate,
    last_reviewed: null,
  });
}

export function applyReview(
  db: Database,
  noteId: string,
  quality: number,
  reviewedAt: string,
): SchedulingRow {
  const current = getSchedulingForNote(db, noteId);
  const prevEase = current?.ease_factor ?? SM2_DEFAULTS.INITIAL_EASE_FACTOR;
  const prevReps = current?.repetitions ?? 0;
  const prevInterval = current?.interval_days ?? 0;

  const result = sm2(quality, prevEase, prevReps, prevInterval);
  const dueDate = addDays(reviewedAt, result.intervalDays);

  const updated: SchedulingRow = {
    note_id: noteId,
    ease_factor: result.easeFactor,
    repetitions: result.repetitions,
    interval_days: result.intervalDays,
    due_date: dueDate,
    last_reviewed: reviewedAt,
  };

  insertScheduling(db, updated);
  return updated;
}
