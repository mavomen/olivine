import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import { getSchedulingForNote, getDueNotes } from '../../src/models/scheduling';
import { getReviewsForNote } from '../../src/models/review';
import { loadDueSession } from '../../src/session/loader';
import { createSession } from '../../src/session/state';
import { applyQuality, advanceNote } from '../../src/session/state';
import { insertReview } from '../../src/models/review';
import type { NoteRow } from '../../src/models/note';

describe('review lifecycle integration', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  function addNote(id: string, dueDate: string) {
    const note: NoteRow = {
      id,
      path: `${id}.md`,
      title: id,
      content: `Content of ${id}`,
      word_count: 2,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };
    insertNote(db, note);
    initializeScheduling(db, id);
    // Override due_date for controlled testing
    db.run('UPDATE scheduling SET due_date = ? WHERE note_id = ?', [dueDate, id]);
  }

  it('should load session, apply review, and update scheduling', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');

    const session = loadDueSession(db, 10);
    expect(session!.notes).toHaveLength(2);

    const sn = session!.notes[0]!;
    applyQuality(session!, 4);
    advanceNote(session!);

    // Persist review
    insertReview(db, sn.note.id, 4, '2025-06-01');
    applyReview(db, sn.note.id, 4, '2025-06-01');

    const reviews = getReviewsForNote(db, 'a');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.quality).toBe(4);

    const sched = getSchedulingForNote(db, 'a');
    expect(sched!.repetitions).toBe(1);
    expect(sched!.interval_days).toBe(1);
    expect(sched!.due_date).toBe('2025-06-02');
  });

  it('should mark failed reviews correctly', () => {
    addNote('fail', '2025-06-01');

    const session = loadDueSession(db, 10);
    const sn = session!.notes[0]!;
    applyQuality(session!, 0);
    advanceNote(session!);

    insertReview(db, sn.note.id, 0, '2025-06-01');
    applyReview(db, sn.note.id, 0, '2025-06-01');

    const reviews = getReviewsForNote(db, 'fail');
    expect(reviews[0]!.quality).toBe(0);

    const sched = getSchedulingForNote(db, 'fail');
    expect(sched!.repetitions).toBe(0);
    expect(sched!.due_date).toBe('2025-06-02');
  });
});
