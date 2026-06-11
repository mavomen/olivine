import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../review/loader';
import { shuffleSession } from '../review/session';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats, formatStats } from '../stats/formatter';
import { runTuiSession } from '../tui/review/runner';
import { listAlgorithms } from '../scheduling/registry';

/** Build and return the `practice` CLI command for dry-run practice sessions. */
export function buildPracticeCommand(): Command {
  return new Command('practice')
    .description('Practice cards without affecting scheduling')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Only practice cards with this tag')
    .option('--algo <algorithm>', `Algorithm override (${listAlgorithms().join(', ')})`)
    .option('--shuffle', 'Randomize card order')
    .option('--limit <n>', 'Maximum number of cards to practice')
    .action(async (vaultPath: string, options: { tag?: string; algo?: string; shuffle?: boolean; limit?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const limit = options.limit ? parseInt(options.limit, 10) : undefined;
        const session = loadDueSession(db, options.tag, limit);
        if (session && options.shuffle) shuffleSession(session);
        if (!session) {
          const stats = getStats(db);
          console.log('All caught up! No notes due for practice.');
          console.log(formatStats(stats));
          closeDb();
          return;
        }

        // Run the TUI session but skip database writes
        await runTuiSession(db, session, { dryRun: true, algorithmOverride: options.algo });

        closeDb();
      } catch (err) {
        handleError('Practice failed', err);
      }
    });
}
