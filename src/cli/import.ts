import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { insertNote } from '../models/note';
import { insertScheduling } from '../models/scheduling';
import { insertReviewWithId } from '../models/review';
import type { SchedulingRow } from '../models/scheduling';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

interface ImportNote {
  id: string;
  path: string;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string;
  scheduling: SchedulingRow | null;
  reviews: Array<{ id: string; quality: number; reviewed_at: string }>;
}

interface ImportPayload {
  version: number;
  notes: ImportNote[];
}

export function buildImportCommand(): Command {
  return new Command('import')
    .description('Import cards from a JSON export file')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .argument('<file>', 'Path to the JSON file to import')
    .action(async (vaultPath: string, filePath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const content = await fs.readFile(filePath, 'utf-8');
        const data: ImportPayload = JSON.parse(content);

        if (!Array.isArray(data.notes)) {
          throw new Error('Invalid import file: expected "notes" array');
        }

        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        let noteCount = 0;
        let reviewCount = 0;

        db.run('BEGIN TRANSACTION');

        try {
          for (const note of data.notes) {
            insertNote(db, {
              id: note.id,
              path: note.path,
              title: note.title,
              content: note.content,
              word_count: note.word_count,
              created_at: note.created_at,
              updated_at: note.updated_at,
              tags: note.tags,
            });

            if (note.scheduling) {
              insertScheduling(db, note.scheduling);
            }

            for (const review of note.reviews) {
              insertReviewWithId(db, review.id, note.id, review.quality, review.reviewed_at);
              reviewCount++;
            }

            noteCount++;
          }

          db.run('COMMIT');
        } catch (err) {
          db.run('ROLLBACK');
          throw err;
        }

        saveDb(vaultPath);
        closeDb();

        console.log(`Imported ${noteCount} note(s) and ${reviewCount} review(s).`);
      } catch (err) {
        handleError('Import failed', err);
      }
    });
}
