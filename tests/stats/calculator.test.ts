import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import { insertReview } from '../../src/models/review';
import { totalNotes, dueNotesCount, reviewedToday, averageEaseFactor, totalReviews, streak } from '../../src/stats/calculator';
import type { NoteRow } from '../../src/models/note';

describe('stats calculator', () => {
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
      content: 'Content',
      word_count: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };
    insertNote(db, note);
    initializeScheduling(db, id);
    db.run('UPDATE scheduling SET due_date = ? WHERE note_id = ?', [dueDate, id]);
  }

  it('should count total notes', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');
    expect(totalNotes(db)).toBe(2);
  });

  it('should count due notes', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-05');
    expect(dueNotesCount(db, '2025-06-02')).toBe(1);
  });

  it('should count reviews today', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    insertReview(db, 'a', 3, '2025-06-01');
    insertReview(db, 'a', 5, '2025-06-02');
    expect(reviewedToday(db, '2025-06-01')).toBe(2);
  });

  it('should calculate average ease factor', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');
    applyReview(db, 'a', 5, '2025-06-01');
    // a: ease=2.6 (initial 2.5 + 0.1 for quality 5)
    // b: ease=2.5 (unreviewed)
    // avg = (2.6 + 2.5) / 2 = 2.55
    expect(averageEaseFactor(db)).toBe(2.55);
  });

  it('should count total reviews', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    insertReview(db, 'a', 3, '2025-06-02');
    expect(totalReviews(db)).toBe(2);
  });

  it('should calculate streak', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-02');
    expect(streak(db, '2025-06-02')).toBe(2);
  });

  it('should return streak of 0 for no reviews', () => {
    expect(streak(db, '2025-06-01')).toBe(0);
  });
});
