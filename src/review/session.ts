import type { NoteRow } from '../models/note';

/** Phase of a review session. */
export type SessionPhase = 'loading' | 'active' | 'summary';

/** A note with its review status within a session. */
export interface SessionNote {
  note: NoteRow;
  reviewed: boolean;
  quality: number | null;
}

/** Tracks the state of an active review session. */
export interface ReviewSession {
  phase: SessionPhase;
  notes: SessionNote[];
  currentIndex: number;
  startedAt: Date;
  remainingDue: number;
}

/**
 * Creates a new review session for the given notes.
 * @param notes - Notes to include in the session
 * @param remainingDue - Number of additional due notes not included in this session
 * @returns A new ReviewSession in the 'loading' phase
 */
export function createSession(notes: NoteRow[], remainingDue: number = 0): ReviewSession {
  return {
    phase: 'loading',
    notes: notes.map((note) => ({
      note,
      reviewed: false,
      quality: null,
    })),
    currentIndex: 0,
    startedAt: new Date(),
    remainingDue,
  };
}

/**
 * Returns the current note being reviewed, or null if the session is complete.
 * @param session - The active review session
 * @returns The current SessionNote or null
 */
export function currentNote(session: ReviewSession): SessionNote | null {
  if (session.currentIndex >= session.notes.length) return null;
  return session.notes[session.currentIndex] ?? null;
}

/**
 * Records the quality rating for the current note.
 * @param session - The active review session
 * @param quality - Quality rating (0-5)
 */
export function applyQuality(session: ReviewSession, quality: number): void {
  const sn = session.notes[session.currentIndex];
  if (!sn) return;
  sn.quality = quality;
  sn.reviewed = true;
}

/**
 * Advances to the next note. Transitions to 'summary' phase if all notes are done.
 * @param session - The active review session
 * @returns true if there are more notes to review, false if session is complete
 */
export function advanceNote(session: ReviewSession): boolean {
  if (session.currentIndex < session.notes.length - 1) {
    session.currentIndex++;
    return true;
  }
  session.phase = 'summary';
  session.currentIndex = session.notes.length; // push past end so currentNote returns null
  return false;
}

/**
 * Returns the elapsed session duration in milliseconds.
 * @param session - The active review session
 * @returns Duration in milliseconds
 */
export function sessionDuration(session: ReviewSession): number {
  return Date.now() - session.startedAt.getTime();
}

/**
 * Returns summary statistics for the session.
 * @param session - The active review session
 * @returns Object with total, reviewed, and failed counts
 */
export function sessionStats(session: ReviewSession) {
  const reviewed = session.notes.filter((n) => n.reviewed).length;
  const failed = session.notes.filter(
    (n) => n.quality !== null && n.quality < 3,
  ).length;
  return { total: session.notes.length, reviewed, failed };
}

/**
 * Randomly shuffles the notes in the session (Fisher-Yates).
 * @param session - The active review session
 */
export function shuffleSession(session: ReviewSession): void {
  for (let i = session.notes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = session.notes[i];
    session.notes[i] = session.notes[j]!;
    session.notes[j] = tmp!;
  }
}
