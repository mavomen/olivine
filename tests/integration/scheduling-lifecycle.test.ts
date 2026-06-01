import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { getDueNotes, getSchedulingForNote } from '../../src/models/scheduling';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import type { NoteRow } from '../../src/models/note';

describe('scheduling lifecycle integration', () => {
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
      tags: '[]',
    };
    insertNote(db, note);
    initializeScheduling(db, id);
    db.run('UPDATE scheduling SET due_date = ? WHERE note_id = ?', [dueDate, id]);
  }

  it('should progress cards through boxes', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');

    // Both due on 06-01
    let due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(2);

    // Review 'a' correctly — promotes to Box 2
    applyReview(db, 'a', 4, '2025-06-01');

    // 'a' now in Box 2, due in 2 days
    const a = getSchedulingForNote(db, 'a');
    expect(a!.box).toBe(2);
    expect(a!.due_date).toBe('2025-06-03');

    // 'b' still due
    due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(1);
    expect(due[0]!.note_id).toBe('b');
  });

  it('should reset failed cards to Box 1', () => {
    addNote('fail', '2025-06-01');
    applyReview(db, 'fail', 4, '2025-06-01'); // Box 2
    applyReview(db, 'fail', 4, '2025-06-02'); // Box 3

    // Fail
    applyReview(db, 'fail', 0, '2025-06-03');
    const f = getSchedulingForNote(db, 'fail');
    expect(f!.box).toBe(1);
    expect(f!.due_date).toBe('2025-06-04'); // next day
  });

  it('should archive cards after Box 7 correct review', () => {
    addNote('master', '2025-06-01');
    for (let i = 0; i < 6; i++) {
      applyReview(db, 'master', 4, '2025-06-01'); // promote through boxes
    }
    // Now in Box 7
    const before = getSchedulingForNote(db, 'master');
    expect(before!.box).toBe(7);

    // One more correct answer
    applyReview(db, 'master', 4, '2025-06-02');
    const after = getSchedulingForNote(db, 'master');
    expect(after!.archived).toBe(1);

    // Archived cards don't appear as due
    const due = getDueNotes(db, '2099-01-01', 10);
    expect(due.filter((d) => d.note_id === 'master')).toHaveLength(0);
  });
});
