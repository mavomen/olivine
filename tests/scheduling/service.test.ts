import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { getSchedulingForNote } from '../../src/models/scheduling';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import type { NoteRow } from '../../src/models/note';

describe('scheduling service', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
    const note: NoteRow = {
      id: 'test-note',
      path: 'note.md',
      title: 'Test Note',
      content: 'Content',
      word_count: 1,
      created_at: '2025-06-01',
      updated_at: '2025-06-01',
    };
    insertNote(db, note);
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeScheduling', () => {
    it('should create a scheduling record for a new note', () => {
      initializeScheduling(db, 'test-note');
      const row = getSchedulingForNote(db, 'test-note');
      expect(row).toBeTruthy();
      expect(row!.ease_factor).toBe(2.5);
      expect(row!.repetitions).toBe(0);
      expect(row!.interval_days).toBe(0);
    });

    it('should not overwrite existing scheduling', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01');
      initializeScheduling(db, 'test-note');
      const row = getSchedulingForNote(db, 'test-note');
      expect(row!.repetitions).toBe(1);
    });
  });

  describe('applyReview — successful reviews', () => {
    it('should update scheduling after a successful review', () => {
      initializeScheduling(db, 'test-note');
      const updated = applyReview(db, 'test-note', 4, '2025-06-01');
      expect(updated.repetitions).toBe(1);
      expect(updated.interval_days).toBe(1);
      expect(updated.due_date).toBe('2025-06-02');
      expect(updated.last_reviewed).toBe('2025-06-01');
    });

    it('should progress through multiple successful reviews', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01'); // rep=1, int=1
      applyReview(db, 'test-note', 4, '2025-06-02'); // rep=2, int=6
      const row = getSchedulingForNote(db, 'test-note');
      expect(row!.repetitions).toBe(2);
      expect(row!.interval_days).toBe(6);
      expect(row!.due_date).toBe('2025-06-08');
    });
  });

  describe('applyReview — failed reviews', () => {
    it('should reset repetitions after a failed review', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01'); // rep=1
      const updated = applyReview(db, 'test-note', 1, '2025-06-02'); // fail
      expect(updated.repetitions).toBe(0);
      expect(updated.interval_days).toBe(1);
      expect(updated.due_date).toBe('2025-06-03');
    });

    it('should reduce ease factor on failure', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01');
      const updated = applyReview(db, 'test-note', 0, '2025-06-02');
      expect(updated.ease_factor).toBeLessThan(2.5);
      expect(updated.ease_factor).toBeGreaterThanOrEqual(1.3);
    });
  });
});
