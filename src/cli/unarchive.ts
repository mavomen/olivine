import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { todayISO } from '../utils/date';

export function buildUnarchiveCommand(): Command {
  return new Command('unarchive')
    .description('Bring an archived card back into rotation')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
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

        const today = todayISO();
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
