import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling } from '../../src/scheduling/service';
import { loadDueSession } from '../../src/review/loader';
import type { NoteRow } from '../../src/models/note';

describe('session loader', () => {
  let db: any;

  beforeEach(async () => {
    db = await createMemoryDb();
    bootstrapDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  function addNote(id: string) {
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
  }

  it('should load due notes into a session', () => {
    addNote('a');
    addNote('b');
    const session = loadDueSession(db);
    expect(session).not.toBeNull();
    expect(session!.notes).toHaveLength(2);
  });

  it('should return null when no notes are due', () => {
    const session = loadDueSession(db);
    expect(session).toBeNull();
  });

  it('should limit notes when limit param is provided', () => {
    addNote('a');
    addNote('b');
    addNote('c');
    const session = loadDueSession(db, undefined, 2);
    expect(session).not.toBeNull();
    expect(session!.notes).toHaveLength(2);
  });

  it('should calculate remainingDue when limit is applied', () => {
    addNote('a');
    addNote('b');
    addNote('c');
    const session = loadDueSession(db, undefined, 2);
    expect(session!.remainingDue).toBe(1);
  });

  it('should set remainingDue to 0 when limit exceeds total due', () => {
    addNote('a');
    addNote('b');
    const session = loadDueSession(db, undefined, 10);
    expect(session!.notes).toHaveLength(2);
    expect(session!.remainingDue).toBe(0);
  });

  it('should set remainingDue to 0 when no limit', () => {
    addNote('a');
    addNote('b');
    addNote('c');
    const session = loadDueSession(db);
    expect(session!.remainingDue).toBe(0);
  });
});
