import { promises as fs } from 'node:fs';
import { Database } from 'sql.js';
import { scanVault } from '../vault/scanner';
import { parseMarkdown } from '../vault/parser';
import { insertNote, getAllNotes, deleteNoteByPath, getNoteByPath } from '../models/note';
import { initializeScheduling } from '../scheduling/service';
import { deleteReviewsForNote } from '../models/review';
import { deleteScheduling } from '../models/scheduling';
import type { NoteRow } from '../models/note';
import { logger } from '../utils/logger';

export async function syncVault(vaultPath: string, db: Database): Promise<{ added: number; removed: number }> {
  const scannedFiles = await scanVault(vaultPath);
  const existingNotes = getAllNotes(db);
  const existingPaths = new Set(existingNotes.map((n) => n.path));
  const scannedPaths = new Set(scannedFiles.map((f) => f.relativePath));

  let added = 0;
  for (const file of scannedFiles) {
    const raw = await fs.readFile(file.fullPath, 'utf-8');
    const parsed = parseMarkdown(raw);
    const stat = await fs.stat(file.fullPath);
    const note: NoteRow = {
      id: file.relativePath,
      path: file.relativePath,
      title: parsed.title,
      content: parsed.content,
      word_count: parsed.wordCount,
      created_at: stat.birthtime.toISOString().split('T')[0]!,
      updated_at: stat.mtime.toISOString().split('T')[0]!,
      tags: JSON.stringify(parsed.tags),
    };
    if (!existingPaths.has(file.relativePath)) {
      added++;
      insertNote(db, note);
      initializeScheduling(db, note.id);
    } else {
      insertNote(db, note);
    }
  }

  let removed = 0;
  for (const existingPath of existingPaths) {
    if (!scannedPaths.has(existingPath)) {
      const note = getNoteByPath(db, existingPath);
      deleteNoteByPath(db, existingPath);
      if (note) {
        deleteScheduling(db, note.id);
        deleteReviewsForNote(db, note.id);
      }
      removed++;
    }
  }

  logger.info(`Sync complete: ${added} added, ${removed} removed`);
  return { added, removed };
}
