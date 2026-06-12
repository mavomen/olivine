import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { todayISO } from '../utils/date';

export function buildUnsuspendCommand(): Command {
  return new Command('unsuspend')
    .description('Bring a suspended card back into review rotation')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--all', 'Unsuspend all suspended cards')
    .option('--id <noteId>', 'Unsuspend a specific card by ID')
    .action(async (vaultPath: string, options: { all?: boolean; id?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const suspendedResult = db.exec(
          `SELECT s.note_id, n.title FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.suspended = 1`
        );
        if (suspendedResult.length === 0 || suspendedResult[0]!.values.length === 0) {
          console.log('No suspended cards.');
          closeDb();
          return;
        }

        const today = todayISO();
        const isTty = !!process.stdout.isTTY;

        if (options.all) {
          db.run(
            `UPDATE scheduling SET suspended = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE suspended = 1`,
            [today]
          );
          saveDb(vaultPath);
          closeDb();
          console.log(`All suspended cards unsuspended and reset to Box 1.`);
          return;
        }

        if (options.id) {
          db.run(
            'UPDATE scheduling SET suspended = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE note_id = ? AND suspended = 1',
            [today, options.id]
          );
          saveDb(vaultPath);
          closeDb();
          console.log(`Card unsuspended and reset to Box 1.`);
          return;
        }

        if (!isTty) {
          throw new Error(
            'Interactive mode requires a TTY. Use --id <noteId> to unsuspend a specific card, or --all to unsuspend everything.'
          );
        }

        const { default: inquirer } = await import('inquirer');
        const choices = suspendedResult[0]!.values.map((row: unknown[]) => ({
          name: row[1],
          value: row[0],
        }));

        const { noteId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'noteId',
            message: 'Select a card to unsuspend:',
            choices: [
              ...choices,
              { name: 'Cancel', value: '__cancel__' },
            ],
            pageSize: 15,
          },
        ]);

        if (noteId === '__cancel__') {
          closeDb();
          return;
        }

        db.run(
          'UPDATE scheduling SET suspended = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE note_id = ?',
          [today, noteId]
        );

        saveDb(vaultPath);
        closeDb();
        console.log(`Card unsuspended and reset to Box 1.`);
      } catch (err) {
        handleError('Unsuspend failed', err);
      }
    });
}
