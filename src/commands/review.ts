import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadDueSession } from '../session/loader';
import { runReviewSession } from '../session/runner';
import { loadConfig } from '../config/loader';
import { logger } from '../utils/logger';

export function buildReviewCommand(): Command {
  return new Command('review')
    .description('Start an interactive review session')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const session = loadDueSession(db, config.dailyReviewLimit);
        if (!session) {
          logger.info('No notes due for review!');
          closeDb();
          return;
        }

        await runReviewSession(db, session);
        saveDb(vaultPath);
        closeDb();
      } catch (err) {
        logger.error(`Review failed: ${String(err)}`);
        process.exit(1);
      }
    });
}
