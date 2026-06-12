import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getStats, formatStats } from '../stats/formatter';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

/** Build and return the `stats` CLI command for displaying learning statistics. */
export function buildStatsCommand(): Command {
  return new Command('stats')
    .description('Display learning statistics')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Filter statistics by tag')
    .option('--tui', 'Open the statistics dashboard (blessed TUI)')
    .option('--json', 'Output statistics as JSON')
    .action(async (vaultPath: string, options: { tag?: string; tui?: boolean; json?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        if (options.tui) {
          const { openStatsTui } = await import('../tui/stats/index');
          openStatsTui(vaultPath, db, options.tag);
        } else if (options.json) {
          const stats = getStats(db, options.tag);
          console.log(JSON.stringify(stats, null, 2));
          closeDb();
        } else {
          const stats = getStats(db, options.tag);
          console.log(formatStats(stats));
          closeDb();
        }
      } catch (err) {
        handleError('Stats failed', err);
      }
    });
}
