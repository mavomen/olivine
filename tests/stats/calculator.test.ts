import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import { insertReview } from '../../src/models/review';
import { totalNotes, dueNotesCount, reviewedToday, boxDistribution, archivedCount, totalReviews, streak } from '../../src/stats/calculator';
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

  function addNote(id: string, dueDate: string, tags?: string) {
    const note: NoteRow = {
      id,
      path: `${id}.md`,
      title: id,
      content: 'Content',
      word_count: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      tags: tags ?? '[]',
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

  it('should count total notes filtered by tag', () => {
    addNote('a', '2025-06-01', '["math"]');
    addNote('b', '2025-06-01', '["science"]');
    expect(totalNotes(db, 'math')).toBe(1);
    expect(totalNotes(db, 'nonexistent')).toBe(0);
  });

  it('should count due notes', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-05');
    expect(dueNotesCount(db, '2025-06-02')).toBe(1);
  });

  it('should count due notes filtered by tag', () => {
    addNote('a', '2025-06-01', '["math"]');
    addNote('b', '2025-06-01', '["science"]');
    expect(dueNotesCount(db, '2025-06-02', 'math')).toBe(1);
    expect(dueNotesCount(db, '2025-06-02', 'nonexistent')).toBe(0);
  });

  it('should count reviews today', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    insertReview(db, 'a', 3, '2025-06-01');
    insertReview(db, 'a', 5, '2025-06-02');
    expect(reviewedToday(db, '2025-06-01')).toBe(2);
  });

  it('should show box distribution', () => {
    addNote('a', '2025-06-01');
    addNote('b', '2025-06-01');
    applyReview(db, 'a', 4, '2025-06-01'); // promotes to Box 2
    const dist = boxDistribution(db);
    expect(dist[2]).toBe(1); // 'a' in Box 2
    expect(dist[1]).toBe(1); // 'b' still in Box 1
  });

  it('should show box distribution filtered by tag', () => {
    addNote('a', '2025-06-01', '["math"]');
    addNote('b', '2025-06-01', '["science"]');
    const dist = boxDistribution(db, 'math');
    expect(dist[1]).toBe(1);
    expect(dist[2]).toBe(0);

    const noMatch = boxDistribution(db, 'nonexistent');
    expect(noMatch[1]).toBe(0);
  });

  it('should return all-zero box distribution for empty vault', () => {
    const dist = boxDistribution(db);
    for (let i = 1; i <= 7; i++) {
      expect(dist[i]).toBe(0);
    }
  });

  it('should count archived cards', () => {
    addNote('a', '2025-06-01');
    db.run('UPDATE scheduling SET archived = 1 WHERE note_id = ?', ['a']);
    expect(archivedCount(db)).toBe(1);
  });

  it('should count archived cards filtered by tag', () => {
    addNote('a', '2025-06-01', '["math"]');
    addNote('b', '2025-06-01', '["science"]');
    db.run('UPDATE scheduling SET archived = 1 WHERE note_id IN (?, ?)', ['a', 'b']);
    expect(archivedCount(db, 'math')).toBe(1);
    expect(archivedCount(db, 'nonexistent')).toBe(0);
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

  it('should break streak on gap in the middle', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-02');
    insertReview(db, 'a', 4, '2025-06-04');
    // Streak from today (2025-06-04) backwards: 04, then 03 missing → break → streak=1
    expect(streak(db, '2025-06-04')).toBe(1);
  });

  it('should count single-day streak', () => {
    addNote('a', '2025-06-01');
    insertReview(db, 'a', 4, '2025-06-01');
    expect(streak(db, '2025-06-01')).toBe(1);
  });
});
