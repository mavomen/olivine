import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes } from '../models/note';
import { getAllScheduling, SchedulingRow } from '../models/scheduling';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import chalk from 'chalk';

export function buildBrowseCommand(): Command {
  return new Command('browse')
    .description('Browse cards')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--all', 'Include archived cards')
    .action(async (vaultPath: string, options: { all?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        const scheduling = getAllScheduling(db);
        // Build a map for quick lookup
        const schedMap = new Map<string, SchedulingRow>();
        for (const s of scheduling) schedMap.set(s.note_id, s);

        // Get archived scheduling if --all
        let archivedIds = new Set<string>();
        if (options.all) {
          const result = db.exec('SELECT note_id FROM scheduling WHERE archived = 1');
          if (result.length > 0) {
            for (const row of result[0]!.values) {
              archivedIds.add(row[0] as string);
            }
          }
        }

        // Active = has scheduling row with archived=0
        const activeNoteIds = new Set(scheduling.filter(s => s.archived === 0).map(s => s.note_id));
        // Show: active notes + optionally archived notes
        const displayNotes = notes.filter(n => activeNoteIds.has(n.id) || (options.all && archivedIds.has(n.id)));

        if (displayNotes.length === 0) {
          console.log('No cards to display.');
          if (!options.all) console.log('Use --all to include archived cards.');
          closeDb();
          return;
        }

        const { default: inquirer } = await import('inquirer');
        let browsing = true;

        while (browsing) {
          const choices = displayNotes.map((n) => {
            const isArchived = archivedIds.has(n.id);
            const box = schedMap.get(n.id)?.box;
            let label = n.title;
            if (isArchived) label = chalk.gray(label + ' (archived)');
            else if (box) label = `${label}  ${chalk.dim('Box ' + box)}`;
            return { name: label, value: n.id };
          });

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

          const note = displayNotes.find((n) => n.id === selected);
          if (!note) continue;

          const isArchived = archivedIds.has(note.id);
          const box = schedMap.get(note.id)?.box;
          console.log(chalk.bold.yellow('\n' + '═'.repeat(60)));
          if (isArchived) {
            console.log(chalk.bold.gray('  [ARCHIVED]'));
          } else if (box) {
            console.log(chalk.bold.cyan(`  [Box ${box}]`));
          }
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
