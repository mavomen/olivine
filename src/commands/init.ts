import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { ensureOlivineDir } from '../config/initializer';
import { saveConfig, defaultConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildInitCommand(): Command {
  return new Command('init')
    .description('Initialize Olivine in the current vault directory')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        await ensureOlivineDir(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        saveDb(vaultPath);
        closeDb();
        await saveConfig(vaultPath, defaultConfig());
        console.log(`Initialized Olivine in ${vaultPath}`);
      } catch (err) {
        handleError('Failed to initialize', err);
      }
    });
}
