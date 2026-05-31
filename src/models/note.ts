import Database from 'better-sqlite3';

export interface NoteRow {
  id: string;
  path: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export function insertNote(db: Database.Database, note: NoteRow): void {
  db.prepare(
    `INSERT OR REPLACE INTO notes (id, path, title, content, word_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(note.id, note.path, note.title, note.content, note.word_count, note.created_at, note.updated_at);
}

export function getNoteById(db: Database.Database, id: string): NoteRow | undefined {
  return db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined;
}

export function getNoteByPath(db: Database.Database, filePath: string): NoteRow | undefined {
  return db.prepare('SELECT * FROM notes WHERE path = ?').get(filePath) as NoteRow | undefined;
}

export function getAllNotes(db: Database.Database): NoteRow[] {
  return db.prepare('SELECT * FROM notes ORDER BY path').all() as NoteRow[];
}

export function deleteNote(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}

export function deleteNoteByPath(db: Database.Database, filePath: string): void {
  db.prepare('DELETE FROM notes WHERE path = ?').run(filePath);
}
