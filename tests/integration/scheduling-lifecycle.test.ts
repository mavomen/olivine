import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote, getAllNotes } from '../../src/models/note';
import { getDueNotes } from '../../src/models/scheduling';
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

  function addNote(id: string, path: string) {
    const note: NoteRow = {
      id,
      path,
      title: id,
      content: `Content of ${id}`,
      word_count: 2,
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    };
    insertNote(db, note);
    initializeScheduling(db, id);
  }

  it('should progress notes from new to due', () => {
    addNote('a', 'a.md');
    addNote('b', 'b.md');

    // Both new — due immediately (today)
    let due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(2);

    // Review 'a' successfully
    applyReview(db, 'a', 4, '2025-06-01');
    due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(1); // only 'b' still due today
    expect(due[0]!.note_id).toBe('b');

    // 'a' should be due tomorrow
    due = getDueNotes(db, '2025-06-02', 10);
    expect(due).toHaveLength(1);
    expect(due[0]!.note_id).toBe('a');
  });

  it('should keep failed notes due within one day', () => {
    addNote('fail', 'fail.md');
    applyReview(db, 'fail', 1, '2025-06-01'); // failed

    let due = getDueNotes(db, '2025-06-02', 10);
    expect(due).toHaveLength(1);

    // Still due after failing again
    applyReview(db, 'fail', 0, '2025-06-02');
    due = getDueNotes(db, '2025-06-03', 10);
    expect(due).toHaveLength(1);
  });

  it('should schedule successful notes further into the future', () => {
    addNote('master', 'master.md');
    applyReview(db, 'master', 4, '2025-06-01'); // int=1, due 06-02
    applyReview(db, 'master', 4, '2025-06-02'); // int=6, due 06-08

    let due = getDueNotes(db, '2025-06-08', 10);
    expect(due).toHaveLength(1);

    applyReview(db, 'master', 5, '2025-06-08'); // int=~15, due 06-23
    due = getDueNotes(db, '2025-06-23', 10);
    expect(due).toHaveLength(1);
    due = getDueNotes(db, '2025-06-20', 10);
    expect(due).toHaveLength(0);
  });
});
