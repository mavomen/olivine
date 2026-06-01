import { Database } from 'sql.js';
import { leitner, BOX_INTERVALS } from '../algorithms/leitner';
import {
  insertScheduling,
  getSchedulingForNote,
} from '../models/scheduling';
import type { SchedulingRow } from '../models/scheduling';
import { todayISO, addDays } from '../utils/date';

export function initializeScheduling(db: Database, noteId: string): void {
  const existing = getSchedulingForNote(db, noteId);
  if (existing) return;

  const dueDate = todayISO();
  insertScheduling(db, {
    note_id: noteId,
    ease_factor: 0,
    repetitions: 0,
    interval_days: BOX_INTERVALS[1]!,
    due_date: dueDate,
    last_reviewed: null,
    box: 1,
    archived: 0,
  });
}

export function applyReview(
  db: Database,
  noteId: string,
  quality: number,
  reviewedAt: string,
): SchedulingRow {
  const current = getSchedulingForNote(db, noteId);
  const currentBox = current?.box ?? 1;

  const result = leitner(quality, currentBox);
  const dueDate = addDays(reviewedAt, result.intervalDays);

  const updated: SchedulingRow = {
    note_id: noteId,
    ease_factor: 0,
    repetitions: current?.repetitions ?? 0,
    interval_days: result.intervalDays,
    due_date: dueDate,
    last_reviewed: reviewedAt,
    box: result.box,
    archived: result.archived ? 1 : 0,
  };

  insertScheduling(db, updated);
  return updated;
}
