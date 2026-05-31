import {
  createSession,
  currentNote,
  applyQuality,
  advanceNote,
  sessionStats,
  sessionDuration,
} from '../../src/session/state';
import type { NoteRow } from '../../src/models/note';

const makeNote = (id: string): NoteRow => ({
  id,
  path: `${id}.md`,
  title: id,
  content: 'Content',
  word_count: 1,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
});

describe('session state', () => {
  const notes = [makeNote('a'), makeNote('b'), makeNote('c')];

  it('should create session with all notes unreviewed', () => {
    const session = createSession(notes);
    expect(session.notes).toHaveLength(3);
    session.notes.forEach((n) => {
      expect(n.reviewed).toBe(false);
      expect(n.quality).toBeNull();
    });
    expect(session.phase).toBe('loading');
  });

  it('should return current note', () => {
    const session = createSession(notes);
    expect(currentNote(session)?.note.id).toBe('a');
  });

  it('should apply quality and mark reviewed', () => {
    const session = createSession(notes);
    applyQuality(session, 4);
    expect(session.notes[0]!.quality).toBe(4);
    expect(session.notes[0]!.reviewed).toBe(true);
  });

  it('should advance through notes', () => {
    const session = createSession(notes);
    expect(session.currentIndex).toBe(0);

    advanceNote(session);
    expect(session.currentIndex).toBe(1);

    advanceNote(session);
    expect(session.currentIndex).toBe(2);

    advanceNote(session);
    expect(session.phase).toBe('summary');
    expect(session.currentIndex).toBe(2);
  });

  it('should calculate stats', () => {
    const session = createSession(notes);
    applyQuality(session, 4);
    advanceNote(session);
    applyQuality(session, 0);
    advanceNote(session);
    applyQuality(session, 5);
    advanceNote(session);

    const stats = sessionStats(session);
    expect(stats.total).toBe(3);
    expect(stats.reviewed).toBe(3);
    expect(stats.failed).toBe(1);
  });

  it('should calculate session duration', () => {
    const session = createSession(notes);
    const duration = sessionDuration(session);
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
