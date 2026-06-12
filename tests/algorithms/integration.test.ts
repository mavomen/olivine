import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { getSchedulingForNote } from '../../src/models/scheduling';
import { initializeScheduling, applyReview } from '../../src/scheduling/service';
import type { NoteRow } from '../../src/models/note';

describe('scheduling integration', () => {
  let db: any;

  function insertNoteWithId(id: string) {
    const note: NoteRow = {
      id,
      path: `${id}.md`,
      title: id,
      content: 'Content',
      word_count: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
      tags: '[]',
    };
    insertNote(db, note);
  }

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeScheduling', () => {
    it('should create initial scheduling for a note', () => {
      insertNoteWithId('test');
      initializeScheduling(db, 'test');
      const sched = getSchedulingForNote(db, 'test');
      expect(sched).toBeDefined();
      expect(sched!.archived).toBe(0);
      expect(sched!.due_date).toBeTruthy();
    });

    it('should default to leitner algorithm', () => {
      insertNoteWithId('test');
      initializeScheduling(db, 'test');
      const sched = getSchedulingForNote(db, 'test');
      expect(sched!.algorithm).toBe('leitner');
    });

    it('should accept algorithm override', () => {
      insertNoteWithId('test');
      initializeScheduling(db, 'test', 'sm2');
      const sched = getSchedulingForNote(db, 'test');
      expect(sched!.algorithm).toBe('sm2');
    });

    it('should not overwrite existing scheduling', () => {
      insertNoteWithId('test');
      initializeScheduling(db, 'test');
      initializeScheduling(db, 'test', 'sm2');
      const sched = getSchedulingForNote(db, 'test');
      expect(sched!.algorithm).toBe('leitner');
    });
  });

  describe.each([
    { algorithm: 'leitner' },
    { algorithm: 'sm2' },
    { algorithm: 'fsrs' },
  ])('$algorithm algorithm', ({ algorithm }) => {
    it('should apply review and update scheduling', () => {
      insertNoteWithId(`${algorithm}-1`);
      initializeScheduling(db, `${algorithm}-1`, algorithm);
      const result = applyReview(db, `${algorithm}-1`, 4, '2025-06-01');
      expect(result.interval_days).toBeGreaterThanOrEqual(1);
      expect(result.last_reviewed).toBe('2025-06-01');
    });

    it('should increase interval on correct answers', () => {
      insertNoteWithId(`${algorithm}-2`);
      initializeScheduling(db, `${algorithm}-2`, algorithm);
      const r1 = applyReview(db, `${algorithm}-2`, 4, '2025-06-01');
      const r2 = applyReview(db, `${algorithm}-2`, 4, '2025-06-02');
      expect(r2.interval_days).toBeGreaterThanOrEqual(r1.interval_days);
    });

    it('should reset or decrease on wrong answers', () => {
      insertNoteWithId(`${algorithm}-3`);
      initializeScheduling(db, `${algorithm}-3`, algorithm);
      applyReview(db, `${algorithm}-3`, 4, '2025-06-01');
      const r2 = applyReview(db, `${algorithm}-3`, 1, '2025-06-02');
      if (algorithm === 'leitner') {
        expect(r2.box).toBe(1);
      }
    });

    it('should persist algorithm in scheduling row', () => {
      insertNoteWithId(`${algorithm}-4`);
      initializeScheduling(db, `${algorithm}-4`, algorithm);
      applyReview(db, `${algorithm}-4`, 3, '2025-06-01');
      const sched = getSchedulingForNote(db, `${algorithm}-4`);
      expect(sched!.algorithm).toBe(algorithm);
    });

    it('should handle quality 0-5 without throwing', () => {
      insertNoteWithId(`${algorithm}-5`);
      initializeScheduling(db, `${algorithm}-5`, algorithm);
      for (let q = 0; q <= 5; q++) {
        expect(() => applyReview(db, `${algorithm}-5`, q, '2025-06-01')).not.toThrow();
      }
    });
  });

  it('should throw for missing scheduling record', () => {
    insertNoteWithId('missing');
    expect(() => applyReview(db, 'missing', 4, '2025-06-01')).toThrow('No scheduling record found');
  });
});
