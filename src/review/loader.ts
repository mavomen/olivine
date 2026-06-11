import { Database } from 'sql.js';
import { getDueNotes, getDueNotesByTag } from '../models/scheduling';
import { getNoteById } from '../models/note';
import { createSession, type ReviewSession } from './session';
import { logger } from '../utils/logger';
import { todayISO } from '../utils/date';

export function loadDueSession(db: Database, tag?: string, limit?: number): ReviewSession | null {
  const today = todayISO();
  const due = tag
    ? getDueNotesByTag(db, today, tag, Number.MAX_SAFE_INTEGER)
    : getDueNotes(db, today, Number.MAX_SAFE_INTEGER);

  if (due.length === 0) {
    return null;
  }

  const allNotes = due
    .map((s) => {
      const note = getNoteById(db, s.note_id);
      return note || null;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  const sessionNotes = limit ? allNotes.slice(0, limit) : allNotes;
  const remainingDue = limit ? Math.max(0, allNotes.length - limit) : 0;

  logger.info(`Loaded ${sessionNotes.length} due notes for review`);
  return createSession(sessionNotes, remainingDue);
}
