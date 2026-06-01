import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import { getSchedulingForNote } from '../../src/models/scheduling';
import { getReviewsForNote } from '../../src/models/review';
import { loadDueSession } from '../../src/session/loader';
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
    db.run('UPDATE scheduling SET due_date = ? WHERE note_id = ?', [dueDate, id]);
  }

  it('should load session, apply review, promote box', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');

    const session = loadDueSession(db);
    expect(session!.notes).toHaveLength(2);

    const sn = session!.notes[0]!;
    applyQuality(session!, 4);
    advanceNote(session!);

    insertReview(db, sn.note.id, 4, '2025-06-01');
    applyReview(db, sn.note.id, 4, '2025-06-01');

    const sched = getSchedulingForNote(db, 'a');
    expect(sched!.box).toBe(2);
    expect(sched!.archived).toBe(0);
  });

  it('should reset failed reviews to Box 1', () => {
    addNote('fail', '2025-06-01');

    const session = loadDueSession(db);
    const sn = session!.notes[0]!;
    applyQuality(session!, 0);
    advanceNote(session!);

    insertReview(db, sn.note.id, 0, '2025-06-01');
    applyReview(db, sn.note.id, 0, '2025-06-01');

    const sched = getSchedulingForNote(db, 'fail');
    expect(sched!.box).toBe(1);
  });
});
