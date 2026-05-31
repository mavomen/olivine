import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { ensureOlivineDir } from '../config/initializer';
import { saveConfig, defaultConfig } from '../config/loader';
import { logger } from '../utils/logger';

export function buildInitCommand(): Command {
  return new Command('init')
    .description('Initialize Olivine in the current vault directory')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await ensureOlivineDir(vaultPath);
        const db = getDb(vaultPath);
        bootstrapDatabase(db);
        closeDb();
        await saveConfig(vaultPath, defaultConfig());
        logger.info(`Initialized Olivine in ${vaultPath}`);
      } catch (err) {
        logger.error(`Failed to initialize: ${String(err)}`);
        process.exit(1);
      }
    });
}
