import Database from 'better-sqlite3';
import { bootstrapDatabase } from '../../src/database/bootstrap';
import { insertNote, getNoteById, getNoteByPath, getAllNotes, deleteNote } from '../../src/models/note';
import type { NoteRow } from '../../src/models/note';

describe('note repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    bootstrapDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  const sampleNote: NoteRow = {
    id: 'abc123',
    path: '/vault/notes/alpha.md',
    title: 'Alpha',
    content: 'Some content',
    word_count: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-02',
  };

  it('should insert and retrieve a note by id', () => {
    insertNote(db, sampleNote);
    const note = getNoteById(db, 'abc123');
    expect(note).toEqual(sampleNote);
  });

  it('should retrieve a note by path', () => {
    insertNote(db, sampleNote);
    const note = getNoteByPath(db, '/vault/notes/alpha.md');
    expect(note).toEqual(sampleNote);
  });

  it('should return undefined for missing note', () => {
    expect(getNoteById(db, 'nope')).toBeUndefined();
    expect(getNoteByPath(db, 'nope')).toBeUndefined();
  });

  it('should retrieve all notes', () => {
    insertNote(db, sampleNote);
    insertNote(db, {
      ...sampleNote,
      id: 'def456',
      path: '/vault/notes/beta.md',
      title: 'Beta',
    });
    const all = getAllNotes(db);
    expect(all).toHaveLength(2);
    expect(all[0]?.title).toBe('Alpha');
    expect(all[1]?.title).toBe('Beta');
  });

  it('should delete a note', () => {
    insertNote(db, sampleNote);
    deleteNote(db, 'abc123');
    expect(getNoteById(db, 'abc123')).toBeUndefined();
  });
});
