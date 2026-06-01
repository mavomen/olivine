import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getStats, formatStats } from '../stats/formatter';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildStatsCommand(): Command {
  return new Command('stats')
    .description('Display learning statistics')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Filter statistics by tag')
    .action(async (vaultPath: string, options: { tag?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        const stats = getStats(db, options.tag);
        console.log(formatStats(stats));
        closeDb();
      } catch (err) {
        handleError('Stats failed', err);
      }
    });
}
