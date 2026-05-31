import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getStats, formatStats } from '../stats/formatter';
import { logger } from '../utils/logger';

export function buildStatsCommand(): Command {
  return new Command('stats')
    .description('Display learning statistics')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        const stats = getStats(db);
        console.log(formatStats(stats));
        closeDb();
      } catch (err) {
        logger.error(`Stats failed: ${String(err)}`);
        process.exit(1);
      }
    });
}
