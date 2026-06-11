import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import {
  insertScheduling,
  getSchedulingForNote,
  getAllScheduling,
  getDueNotes,
  deleteScheduling,
} from '../../src/models/scheduling';
import type { NoteRow } from '../../src/models/note';
import type { SchedulingRow } from '../../src/models/scheduling';

describe('scheduling repository', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
    const note1: NoteRow = {
      id: 'abc123',
      path: '/vault/notes/alpha.md',
      title: 'Alpha',
      content: 'Some content',
      word_count: 2,
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
      tags: '[]',
    };
    const note2: NoteRow = {
      id: 'def456',
      path: '/vault/notes/beta.md',
      title: 'Beta',
      content: 'More content',
      word_count: 2,
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
      tags: '[]',
    };
    insertNote(db, note1);
    insertNote(db, note2);
  });

  afterEach(() => {
    db.close();
  });

  const scheduling: SchedulingRow = {
    note_id: 'abc123',
    ease_factor: 0,
    repetitions: 0,
    interval_days: 1,
    due_date: '2025-06-01',
    last_reviewed: null,
    box: 1,
    archived: 0,
    algorithm: 'leitner',
    stability: 0,
    difficulty: 5,
  };

  it('should insert and retrieve scheduling', () => {
    insertScheduling(db, scheduling);
    const row = getSchedulingForNote(db, 'abc123');
    expect(row).toEqual(scheduling);
  });

  it('should replace scheduling on insert', () => {
    insertScheduling(db, scheduling);
    insertScheduling(db, { ...scheduling, box: 2 });
    const row = getSchedulingForNote(db, 'abc123');
    expect(row!.box).toBe(2);
  });

  it('should return all scheduling rows (including archived)', () => {
    insertScheduling(db, scheduling);
    insertScheduling(db, { ...scheduling, note_id: 'def456', archived: 1 });
    const all = getAllScheduling(db);
    expect(all).toHaveLength(2);
  });

  it('should find only active due notes', () => {
    insertScheduling(db, scheduling);
    insertScheduling(db, {
      ...scheduling,
      note_id: 'def456',
      due_date: '2025-06-03',
      archived: 1,
    });
    const due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(1);
    expect(due[0]!.note_id).toBe('abc123');
  });

  it('should respect due date ordering', () => {
    insertScheduling(db, scheduling);
    insertScheduling(db, {
      ...scheduling,
      note_id: 'def456',
      due_date: '2025-05-30',
    });
    const due = getDueNotes(db, '2025-06-01', 10);
    expect(due).toHaveLength(2);
    expect(due[0]!.note_id).toBe('def456');
    expect(due[1]!.note_id).toBe('abc123');
  });

  it('should delete scheduling', () => {
    insertScheduling(db, scheduling);
    deleteScheduling(db, 'abc123');
    expect(getSchedulingForNote(db, 'abc123')).toBeUndefined();
  });

  it('should return undefined for missing scheduling', () => {
    expect(getSchedulingForNote(db, 'abc123')).toBeUndefined();
  });
});
