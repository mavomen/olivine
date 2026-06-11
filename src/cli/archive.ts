import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildArchiveCommand(): Command {
  return new Command('archive')
    .description('Manually archive a card (stops it from appearing in reviews)')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--id <noteId>', 'Archive a specific card by ID')
    .action(async (vaultPath: string, options: { id?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const isTty = !!process.stdout.isTTY;

        if (options.id) {
          const stmt = db.prepare('SELECT note_id FROM scheduling WHERE note_id = ? AND archived = 0');
          stmt.bind([options.id]);
          const found = stmt.step();
          stmt.free();
          if (!found) {
            throw new Error(`Card not found or already archived: ${options.id}`);
          }
          db.run('UPDATE scheduling SET archived = 1 WHERE note_id = ?', [options.id]);
          saveDb(vaultPath);
          closeDb();
          console.log(`Card archived: ${options.id}`);
          return;
        }

        if (!isTty) {
          throw new Error('Interactive mode requires a TTY. Use --id <noteId> to archive a specific card.');
        }

        const activeResult = db.exec(
          `SELECT s.note_id, n.title FROM scheduling s
           JOIN notes n ON s.note_id = n.id
           WHERE s.archived = 0
           ORDER BY s.due_date ASC`
        );

        if (activeResult.length === 0 || activeResult[0]!.values.length === 0) {
          console.log('No active cards to archive.');
          closeDb();
          return;
        }

        const { default: inquirer } = await import('inquirer');
        const choices = activeResult[0]!.values.map((row: unknown[]) => ({
          name: row[1],
          value: row[0],
        }));

        const { noteId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'noteId',
            message: 'Select a card to archive:',
            choices: [...choices, { name: 'Cancel', value: '__cancel__' }],
            pageSize: 15,
          },
        ]);

        if (noteId === '__cancel__') {
          closeDb();
          return;
        }

        db.run('UPDATE scheduling SET archived = 1 WHERE note_id = ?', [noteId]);
        saveDb(vaultPath);
        closeDb();
        console.log(`Card archived.`);
      } catch (err) {
        handleError('Archive failed', err);
      }
    });
}
