import { Database } from 'sql.js';

export interface NoteRow {
  id: string;
  path: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string;
}

export function insertNote(db: Database, note: NoteRow): void {
  db.run(
    `INSERT OR REPLACE INTO notes (id, path, title, content, word_count, created_at, updated_at, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [note.id, note.path, note.title, note.content, note.word_count, note.created_at, note.updated_at, note.tags],
  );
}

export function getNoteById(db: Database, id: string): NoteRow | undefined {
  const stmt = db.prepare('SELECT * FROM notes WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    return stmt.getAsObject() as unknown as NoteRow;
  }
  stmt.free();
  return undefined;
}

export function getNoteByPath(db: Database, filePath: string): NoteRow | undefined {
  const stmt = db.prepare('SELECT * FROM notes WHERE path = ?');
  stmt.bind([filePath]);
  if (stmt.step()) {
    return stmt.getAsObject() as unknown as NoteRow;
  }
  stmt.free();
  return undefined;
}

export function getAllNotes(db: Database): NoteRow[] {
  const results = db.exec('SELECT * FROM notes ORDER BY path');
  if (results.length === 0) return [];
  const columns = results[0]!.columns;
  return results[0]!.values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => (obj[col] = row[i]));
    return obj as unknown as NoteRow;
  });
}

export function getNotesByTag(db: Database, tag: string): NoteRow[] {
  const results = db.exec(`SELECT * FROM notes WHERE tags LIKE '%' || ? || '%' ORDER BY path`);
  if (results.length === 0) return [];
  const columns = results[0]!.columns;
  return results[0]!.values.map((row: unknown[]) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col: string, i: number) => (obj[col] = row[i]));
    return obj as unknown as NoteRow;
  });
}

export function deleteNote(db: Database, id: string): void {
  db.run('DELETE FROM notes WHERE id = ?', [id]);
}

export function deleteNoteByPath(db: Database, filePath: string): void {
  db.run('DELETE FROM notes WHERE path = ?', [filePath]);
}
