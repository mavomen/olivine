import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes } from '../models/note';
import { getSchedulingForNote } from '../models/scheduling';
import { getReviewsForNote } from '../models/review';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

/** Build and return the `export` CLI command for exporting cards to JSON. */
export function buildExportCommand(): Command {
  return new Command('export')
    .description('Export all cards to JSON')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--output <file>', 'Output file path (prints to stdout by default)')
    .action(async (vaultPath: string, options: { output?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        const data = {
          version: 1,
          exportedAt: new Date().toISOString().split('T')[0]!,
          notes: notes.map((n) => ({
            id: n.id,
            path: n.path,
            title: n.title,
            content: n.content,
            word_count: n.word_count,
            created_at: n.created_at,
            updated_at: n.updated_at,
            tags: n.tags,
            scheduling: getSchedulingForNote(db, n.id) ?? null,
            reviews: getReviewsForNote(db, n.id),
          })),
        };

        const json = JSON.stringify(data, null, 2);

        if (options.output) {
          const { promises: fs } = await import('node:fs');
          await fs.writeFile(options.output, json, 'utf-8');
          console.log(`Exported ${data.notes.length} note(s) to ${options.output}`);
        } else {
          console.log(json);
        }

        closeDb();
      } catch (err) {
        handleError('Export failed', err);
      }
    });
}
