import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { insertReview, getReviewsForNote, getReviewCountToday, getTotalReviewCount } from '../../src/models/review';
import type { NoteRow } from '../../src/models/note';

describe('review repository', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
    const sampleNote: NoteRow = {
      id: 'abc123',
      path: '/vault/notes/alpha.md',
      title: 'Alpha',
      content: 'Some content',
      word_count: 2,
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    };
    insertNote(db, sampleNote);
  });

  afterEach(() => {
    db.close();
  });

  it('should insert a review and retrieve it', () => {
    const review = insertReview(db, 'abc123', 4, '2025-06-01');
    expect(review.id).toBeTruthy();
    expect(review.note_id).toBe('abc123');
    expect(review.quality).toBe(4);
    expect(review.reviewed_at).toBe('2025-06-01');

    const reviews = getReviewsForNote(db, 'abc123');
    expect(reviews).toHaveLength(1);
    expect(reviews[0]!.quality).toBe(4);
  });

  it('should count reviews today', () => {
    insertReview(db, 'abc123', 4, '2025-06-01');
    insertReview(db, 'abc123', 3, '2025-06-01');
    insertReview(db, 'abc123', 5, '2025-06-02');
    expect(getReviewCountToday(db, '2025-06-01')).toBe(2);
  });

  it('should count total reviews', () => {
    insertReview(db, 'abc123', 4, '2025-06-01');
    insertReview(db, 'abc123', 3, '2025-06-02');
    expect(getTotalReviewCount(db)).toBe(2);
  });

  it('should return empty array for note with no reviews', () => {
    expect(getReviewsForNote(db, 'abc123')).toEqual([]);
  });
});
