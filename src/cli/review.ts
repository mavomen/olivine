import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../review/loader';
import { shuffleSession } from '../review/session';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats, formatStats } from '../stats/formatter';
import { listAlgorithms } from '../scheduling/registry';

/** Build and return the `review` CLI command for interactive review sessions. */
export function buildReviewCommand(): Command {
  return new Command('review')
    .description('Start an interactive review session')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tui', 'Use terminal TUI (blessed) instead of prompts')
    .option('--tag <tag>', 'Only review cards with this tag')
    .option('--algo <algorithm>', `Algorithm override (${listAlgorithms().join(', ')})`)
    .option('--shuffle', 'Randomize card order')
    .option('--limit <n>', 'Maximum number of cards to review')
    .option('--quality <n>', 'Fixed quality rating (0-5) for non-interactive review')
    .action(async (vaultPath: string, options: { tui?: boolean; tag?: string; algo?: string; shuffle?: boolean; limit?: string; quality?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const limit = options.limit ? parseInt(options.limit, 10) : undefined;
        const qualityOverride = options.quality ? parseInt(options.quality, 10) : undefined;
        const session = loadDueSession(db, options.tag, limit);
        if (session && options.shuffle) shuffleSession(session);
        if (!session) {
          const stats = getStats(db);
          console.log('All caught up! No notes due for review.');
          console.log(formatStats(stats));
          closeDb();
          return;
        }

        if (options.tui) {
          const { runTuiSession } = await import('../tui/review/runner');
          await runTuiSession(db, session, { algorithmOverride: options.algo, quality: qualityOverride });
        } else {
          const { runReviewSession } = await import('../review/runner');
          await runReviewSession(db, session, options.algo, qualityOverride);
        }

        saveDb(vaultPath);
        closeDb();
      } catch (err) {
        handleError('Review failed', err);
      }
    });
}
