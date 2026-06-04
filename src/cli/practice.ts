import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../review/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats, formatStats } from '../stats/formatter';
import { runTuiSession } from '../tui/review/runner';

export function buildPracticeCommand(): Command {
  return new Command('practice')
    .description('Practice cards without affecting scheduling')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Only practice cards with this tag')
    .action(async (vaultPath: string, options: { tag?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const session = loadDueSession(db, options.tag);
        if (!session) {
          const stats = getStats(db);
          console.log('All caught up! No notes due for practice.');
          console.log(formatStats(stats));
          closeDb();
          return;
        }

        // Run the TUI session but skip database writes
        await runTuiSession(db, session, { dryRun: true });

        closeDb();
      } catch (err) {
        handleError('Practice failed', err);
      }
    });
}
