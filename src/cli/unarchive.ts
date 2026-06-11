import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { todayISO } from '../utils/date';

/** Build and return the `unarchive` CLI command for restoring archived cards into rotation. */
export function buildUnarchiveCommand(): Command {
  return new Command('unarchive')
    .description('Bring an archived card back into rotation')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--all', 'Unarchive all archived cards')
    .option('--id <noteId>', 'Unarchive a specific card by ID')
    .action(async (vaultPath: string, options: { all?: boolean; id?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const archivedResult = db.exec(
          `SELECT s.note_id, n.title FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 1`
        );
        if (archivedResult.length === 0 || archivedResult[0]!.values.length === 0) {
          console.log('No archived cards.');
          closeDb();
          return;
        }

        const today = todayISO();
        const isTty = !!process.stdout.isTTY;

        if (options.all) {
          db.run(
            `UPDATE scheduling SET archived = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE archived = 1`,
            [today]
          );
          saveDb(vaultPath);
          closeDb();
          console.log(`All archived cards unarchived and reset to Box 1.`);
          return;
        }

        if (options.id) {
          db.run(
            'UPDATE scheduling SET archived = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE note_id = ? AND archived = 1',
            [today, options.id]
          );
          saveDb(vaultPath);
          closeDb();
          console.log(`Card unarchived and reset to Box 1.`);
          return;
        }

        if (!isTty) {
          throw new Error(
            'Interactive mode requires a TTY. Use --id <noteId> to unarchive a specific card, or --all to unarchive everything.'
          );
        }

        const { default: inquirer } = await import('inquirer');
        const choices = archivedResult[0]!.values.map((row: unknown[]) => ({
          name: row[1],
          value: row[0],
        }));

        const { noteId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'noteId',
            message: 'Select a card to unarchive:',
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
          'UPDATE scheduling SET archived = 0, box = 1, due_date = ?, interval_days = 1, repetitions = 0 WHERE note_id = ?',
          [today, noteId]
        );

        saveDb(vaultPath);
        closeDb();
        console.log(`Card unarchived and reset to Box 1.`);
      } catch (err) {
        handleError('Unarchive failed', err);
      }
    });
}
