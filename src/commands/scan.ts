import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { syncVault } from '../sync/service';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildScanCommand(): Command {
  return new Command('scan')
    .description('Scan the vault for markdown files and sync the database')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        const { added, removed } = await syncVault(vaultPath, db);
        saveDb(vaultPath);
        closeDb();
        console.log(`Scan complete: ${added} notes added, ${removed} removed.`);
      } catch (err) {
        handleError('Scan failed', err);
      }
    });
}
