import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { dueNotesCount } from '../stats/calculator';
import { todayISO } from '../utils/date';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildDueCommand(): Command {
  return new Command('due')
    .description('Show number of due notes')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--tag <tag>', 'Filter by tag')
    .action(async (vaultPath: string, options: { tag?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        const count = dueNotesCount(db, todayISO(), options.tag);
        console.log(`${count} note(s) due`);
        closeDb();
      } catch (err) {
        handleError('Due check failed', err);
      }
    });
}
