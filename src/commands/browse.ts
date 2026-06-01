import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes, NoteRow } from '../models/note';
import { getAllScheduling } from '../models/scheduling';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import chalk from 'chalk';

export function buildBrowseCommand(): Command {
  return new Command('browse')
    .description('Browse all active cards')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        const scheduling = getAllScheduling(db);
        const activeNoteIds = new Set(scheduling.map((s) => s.note_id));
        const activeNotes = notes.filter((n) => activeNoteIds.has(n.id));

        if (activeNotes.length === 0) {
          console.log('No active cards. Add some with `olivine add` or scan your vault.');
          closeDb();
          return;
        }

        const { default: inquirer } = await import('inquirer');
        let browsing = true;

        while (browsing) {
          const choices = activeNotes.map((n) => ({
            name: n.title,
            value: n.id,
          }));

          const { selected } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selected',
              message: 'Cards (type to filter):',
              choices: [
                ...choices,
                new inquirer.Separator(),
                { name: chalk.gray('─── Quit ───'), value: '__quit__' },
              ],
              pageSize: 15,
              loop: false,
            },
          ]);

          if (selected === '__quit__') {
            browsing = false;
            break;
          }

          const note = activeNotes.find((n) => n.id === selected);
          if (!note) continue;

          console.log(chalk.bold.yellow('\n' + '═'.repeat(60)));
          console.log(chalk.bold.yellow('  QUESTION:'));
          console.log(chalk.white('  ' + note.title));
          console.log(chalk.bold.yellow('  ANSWER:'));
          note.content.split('\n').forEach((line) => {
            console.log(chalk.white('  ' + line));
          });
          console.log(chalk.bold.yellow('═'.repeat(60) + '\n'));

          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What next?',
              choices: [
                { name: 'Back to list', value: 'back' },
                { name: 'Quit', value: 'quit' },
              ],
            },
          ]);

          if (action === 'quit') {
            browsing = false;
          }
        }

        closeDb();
      } catch (err) {
        handleError('Browse failed', err);
      }
    });
}
