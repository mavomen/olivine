import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { dueNotesCount, totalNotes, totalReviews } from '../stats/calculator';
import { todayISO } from '../utils/date';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

/** Build and return the `due` CLI command for showing the number of due notes. */
export function buildDueCommand(): Command {
  return new Command('due')
    .description('Show number of due notes')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Filter by tag')
    .option('--json', 'Output as JSON')
    .action(async (vaultPath: string, options: { tag?: string; json?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        const today = todayISO();
        const count = dueNotesCount(db, today, options.tag);

        if (options.json) {
          console.log(JSON.stringify({
            dueNotes: count,
            totalNotes: totalNotes(db, options.tag),
            totalReviews: totalReviews(db),
            date: today,
            tag: options.tag ?? null,
          }, null, 2));
        } else {
          console.log(`${count} note(s) due`);
        }

        closeDb();
      } catch (err) {
        handleError('Due check failed', err);
      }
    });
}
