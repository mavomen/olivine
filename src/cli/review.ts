import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../review/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats, formatStats } from '../stats/formatter';

export function buildReviewCommand(): Command {
  return new Command('review')
    .description('Start an interactive review session')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tui', 'Use terminal TUI (blessed) instead of prompts')
    .option('--tag <tag>', 'Only review cards with this tag')
    .action(async (vaultPath: string, options: { tui?: boolean; tag?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const session = loadDueSession(db, options.tag);
        if (!session) {
          const stats = getStats(db);
          console.log('All caught up! No notes due for review.');
          console.log(formatStats(stats));
          closeDb();
          return;
        }

        if (options.tui) {
          const { runTuiSession } = await import('../tui/review/runner');
          await runTuiSession(db, session);
        } else {
          const { runReviewSession } = await import('../review/runner');
          await runReviewSession(db, session);
        }

        saveDb(vaultPath);
        closeDb();
      } catch (err) {
        handleError('Review failed', err);
      }
    });
}
