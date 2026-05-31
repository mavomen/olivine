import { Database } from 'sql.js';
import { getDueNotes } from '../models/scheduling';
import { getNoteById } from '../models/note';
import { initializeScheduling } from '../scheduling/service';
import { createSession, type ReviewSession } from './state';
import { logger } from '../utils/logger';
import { todayISO } from '../utils/date';

export function loadDueSession(
  db: Database,
  limit: number,
): ReviewSession | null {
  const today = todayISO();
  const due = getDueNotes(db, today, limit);

  if (due.length === 0) {
    return null;
  }

  // Ensure all due notes have scheduling initialized and fetch full note data
  const notes = due
    .map((s) => {
      const note = getNoteById(db, s.note_id);
      if (!note) {
        // Note exists in scheduling but not in notes — clean up orphan
        return null;
      }
      return note;
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  logger.info(`Loaded ${notes.length} due notes for review`);
  return createSession(notes);
}
