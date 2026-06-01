import { Database } from 'sql.js';
import { getDueNotes, getDueNotesByTag } from '../models/scheduling';
import { getNoteById } from '../models/note';
import { createSession, type ReviewSession } from './state';
import { logger } from '../utils/logger';
import { todayISO } from '../utils/date';

export function loadDueSession(db: Database, tag?: string): ReviewSession | null {
  const today = todayISO();
  const due = tag
    ? getDueNotesByTag(db, today, tag, Number.MAX_SAFE_INTEGER)
    : getDueNotes(db, today, Number.MAX_SAFE_INTEGER);

  if (due.length === 0) {
    return null;
  }

  const notes = due
    .map((s) => {
      const note = getNoteById(db, s.note_id);
      return note || null;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  logger.info(`Loaded ${notes.length} due notes for review`);
  return createSession(notes);
}
