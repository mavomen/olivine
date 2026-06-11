import type { NoteRow } from '../models/note';

export type SessionPhase = 'loading' | 'active' | 'summary';

export interface SessionNote {
  note: NoteRow;
  reviewed: boolean;
  quality: number | null;
}

export interface ReviewSession {
  phase: SessionPhase;
  notes: SessionNote[];
  currentIndex: number;
  startedAt: Date;
}

export function createSession(notes: NoteRow[]): ReviewSession {
  return {
    phase: 'loading',
    notes: notes.map((note) => ({
      note,
      reviewed: false,
      quality: null,
    })),
    currentIndex: 0,
    startedAt: new Date(),
  };
}

export function currentNote(session: ReviewSession): SessionNote | null {
  if (session.currentIndex >= session.notes.length) return null;
  return session.notes[session.currentIndex] ?? null;
}

export function applyQuality(session: ReviewSession, quality: number): void {
  const sn = session.notes[session.currentIndex];
  if (!sn) return;
  sn.quality = quality;
  sn.reviewed = true;
}

export function advanceNote(session: ReviewSession): boolean {
  if (session.currentIndex < session.notes.length - 1) {
    session.currentIndex++;
    return true;
  }
  session.phase = 'summary';
  session.currentIndex = session.notes.length; // push past end so currentNote returns null
  return false;
}

export function sessionDuration(session: ReviewSession): number {
  return Date.now() - session.startedAt.getTime();
}

export function sessionStats(session: ReviewSession) {
  const reviewed = session.notes.filter((n) => n.reviewed).length;
  const failed = session.notes.filter(
    (n) => n.quality !== null && n.quality < 3,
  ).length;
  return { total: session.notes.length, reviewed, failed };
}

export function shuffleSession(session: ReviewSession): void {
  for (let i = session.notes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = session.notes[i];
    session.notes[i] = session.notes[j]!;
    session.notes[j] = tmp!;
  }
}
