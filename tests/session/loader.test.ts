import { createMemoryDb } from '../test-utils';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote } from '../../src/models/note';
import { initializeScheduling } from '../../src/scheduling/service';
import { loadDueSession } from '../../src/session/loader';
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
    };
    insertNote(db, note);
    initializeScheduling(db, id);
  }

  it('should load due notes into a session', () => {
    addNote('a');
    addNote('b');
    const session = loadDueSession(db, 10);
    expect(session).not.toBeNull();
    expect(session!.notes).toHaveLength(2);
  });

  it('should return null when no notes are due', () => {
    const session = loadDueSession(db, 10);
    expect(session).toBeNull();
  });

  it('should respect the limit', () => {
    addNote('a');
    addNote('b');
    addNote('c');
    const session = loadDueSession(db, 2);
    expect(session!.notes).toHaveLength(2);
  });
});
