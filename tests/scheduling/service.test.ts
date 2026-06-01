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
      tags: '[]',
    };
    insertNote(db, note);
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeScheduling', () => {
    it('should create a scheduling record in Box 1', () => {
      initializeScheduling(db, 'test-note');
      const row = getSchedulingForNote(db, 'test-note');
      expect(row).toBeTruthy();
      expect(row!.box).toBe(1);
      expect(row!.archived).toBe(0);
    });

    it('should not overwrite existing scheduling', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01'); // promote to Box 2
      initializeScheduling(db, 'test-note');
      const row = getSchedulingForNote(db, 'test-note');
      expect(row!.box).toBe(2);
    });
  });

  describe('applyReview', () => {
    it('should promote to Box 2 on correct answer', () => {
      initializeScheduling(db, 'test-note');
      const updated = applyReview(db, 'test-note', 4, '2025-06-01');
      expect(updated.box).toBe(2);
      expect(updated.archived).toBe(0);
    });

    it('should reset to Box 1 on failed review', () => {
      initializeScheduling(db, 'test-note');
      applyReview(db, 'test-note', 4, '2025-06-01'); // Box 2
      const updated = applyReview(db, 'test-note', 1, '2025-06-02'); // fail
      expect(updated.box).toBe(1);
      expect(updated.archived).toBe(0);
    });

    it('should archive after Box 7 correct review', () => {
      initializeScheduling(db, 'test-note');
      // Manually set to Box 7
      db.run('UPDATE scheduling SET box = 7 WHERE note_id = ?', ['test-note']);
      const updated = applyReview(db, 'test-note', 4, '2025-06-01');
      expect(updated.box).toBe(7);
      expect(updated.archived).toBe(1);
    });
  });
});
