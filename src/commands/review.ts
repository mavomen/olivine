import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../session/loader';
import { runReviewSession } from '../session/runner';
import { runTuiSession } from '../session/tui-runner';
import { loadConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats, formatStats } from '../stats/formatter';

export function buildReviewCommand(): Command {
  return new Command('review')
    .description('Start an interactive review session')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tui', 'Use terminal TUI (blessed) instead of prompts')
    .action(async (vaultPath: string, options: { tui?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const session = loadDueSession(db, config.dailyReviewLimit);
        if (!session) {
          const stats = getStats(db);
          console.log('All caught up! No notes due for review.');
          console.log(formatStats(stats));
          closeDb();
          return;
        }

        if (options.tui) {
          await runTuiSession(db, session);
        } else {
          await runReviewSession(db, session);
        }

        saveDb(vaultPath);
        closeDb();
      } catch (err) {
        handleError('Review failed', err);
      }
    });
}
