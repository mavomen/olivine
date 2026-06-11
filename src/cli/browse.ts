import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes, getNoteById, getNotesByTag } from '../models/note';
import { getAllScheduling, SchedulingRow } from '../models/scheduling';
import { getReviewsForNote } from '../models/review';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import chalk from 'chalk';

export function buildBrowseCommand(): Command {
  return new Command('browse')
    .description('Browse cards')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--all', 'Include archived cards')
    .option('--tag <tag>', 'Filter by tag')
    .option('--tui', 'Open full‑screen TUI browser')
    .option('--id <noteId>', 'Show a specific card by ID')
    .option('--json', 'Output card data as JSON (requires --id)')
    .action(async (vaultPath: string, options: { all?: boolean; tag?: string; tui?: boolean; id?: string; json?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const isTty = !!process.stdout.isTTY;

        if (options.tui) {
          if (!isTty) {
            throw new Error('TUI browser requires a TTY. Use --id <noteId> to view a card non-interactively.');
          }
          const { openBrowseTui } = await import('../tui/browse');
          openBrowseTui(vaultPath, db);
          return;
        }

        if (options.id) {
          const note = getNoteById(db, options.id);
          if (!note) throw new Error(`Card not found: ${options.id}`);

          if (options.json) {
            const sched = getAllScheduling(db).find(s => s.note_id === note.id);
            const reviews = getReviewsForNote(db, note.id);
            console.log(JSON.stringify({ note, scheduling: sched ?? null, reviews }, null, 2));
            closeDb();
            return;
          }

          console.log(chalk.bold.yellow('\n' + '═'.repeat(60)));
          if (note.tags && note.tags !== '[]') console.log(chalk.dim('  Tags: ' + JSON.parse(note.tags).join(', ')));
          console.log(chalk.bold.yellow('  QUESTION:'));
          console.log(chalk.white('  ' + note.title));
          console.log(chalk.bold.yellow('  ANSWER:'));
          note.content.split('\n').forEach((line) => console.log(chalk.white('  ' + line)));
          console.log(chalk.bold.yellow('═'.repeat(60) + '\n'));

          if (!isTty) {
            closeDb();
            return;
          }

          // TTY: enter interactive detail view
          let viewing = true;
          const { default: inquirer } = await import('inquirer');
          while (viewing) {
            const { action } = await inquirer.prompt([{
              type: 'list', name: 'action', message: 'What next?',
              choices: [
                { name: 'Back to list', value: 'back' },
                { name: 'View history', value: 'history' },
                { name: 'Quit', value: 'quit' },
              ],
            }]);

            if (action === 'back') viewing = false;
            else if (action === 'quit') { viewing = false; }
            else if (action === 'history') {
              const reviews = getReviewsForNote(db, note.id);
              console.log(chalk.bold.magenta('\n  REVIEW HISTORY:'));
              if (reviews.length === 0) console.log(chalk.gray('  No reviews yet.'));
              else {
                for (const r of reviews) {
                  const qualityColor = r.quality >= 3 ? 'green' : 'red';
                  console.log(chalk`    {bold ${r.reviewed_at}}  quality: {${qualityColor} ${r.quality}}`);
                }
              }
              console.log();
              await inquirer.prompt([{ type: 'input', name: 'dummy', message: 'Press Enter to continue' }]);
            }
          }

          closeDb();
          return;
        }

        if (!isTty) {
          throw new Error('Interactive browse requires a TTY. Use --id <noteId> to view a card non-interactively.');
        }

        const allNotes = options.tag ? getNotesByTag(db, options.tag) : getAllNotes(db);
        const scheduling = getAllScheduling(db);
        const schedMap = new Map<string, SchedulingRow>();
        for (const s of scheduling) schedMap.set(s.note_id, s);

        let archivedIds = new Set<string>();
        if (options.all) {
          const result = db.exec('SELECT note_id FROM scheduling WHERE archived = 1');
          if (result.length > 0) for (const row of result[0]!.values) archivedIds.add(row[0] as string);
        }

        const activeNoteIds = new Set(scheduling.filter(s => s.archived === 0).map(s => s.note_id));
        const displayNotes = allNotes.filter(n => activeNoteIds.has(n.id) || (options.all && archivedIds.has(n.id)));

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

          const { selected } = await inquirer.prompt([{
            type: 'list', name: 'selected', message: 'Cards (type to filter):',
            choices: [...choices, new inquirer.Separator(), { name: chalk.gray('─── Quit ───'), value: '__quit__' }],
            pageSize: 15, loop: false,
          }]);

          if (selected === '__quit__') break;

          const note = displayNotes.find((n) => n.id === selected);
          if (!note) continue;

          let viewing = true;
          while (viewing) {
            console.log(chalk.bold.yellow('\n' + '═'.repeat(60)));
            if (note.tags && note.tags !== '[]') console.log(chalk.dim('  Tags: ' + JSON.parse(note.tags).join(', ')));
            console.log(chalk.bold.yellow('  QUESTION:'));
            console.log(chalk.white('  ' + note.title));
            console.log(chalk.bold.yellow('  ANSWER:'));
            note.content.split('\n').forEach((line) => console.log(chalk.white('  ' + line)));
            console.log(chalk.bold.yellow('═'.repeat(60) + '\n'));

            const { action } = await inquirer.prompt([{
              type: 'list', name: 'action', message: 'What next?',
              choices: [
                { name: 'Back to list', value: 'back' },
                { name: 'View history', value: 'history' },
                { name: 'Quit', value: 'quit' },
              ],
            }]);

            if (action === 'back') viewing = false;
            else if (action === 'quit') { viewing = false; browsing = false; }
            else if (action === 'history') {
              const reviews = getReviewsForNote(db, note.id);
              console.log(chalk.bold.magenta('\n  REVIEW HISTORY:'));
              if (reviews.length === 0) console.log(chalk.gray('  No reviews yet.'));
              else {
                for (const r of reviews) {
                  const qualityColor = r.quality >= 3 ? 'green' : 'red';
                  console.log(chalk`    {bold ${r.reviewed_at}}  quality: {${qualityColor} ${r.quality}}`);
                }
              }
              console.log();
              await inquirer.prompt([{ type: 'input', name: 'dummy', message: 'Press Enter to continue' }]);
            }
          }
        }

        closeDb();
      } catch (err) {
        handleError('Browse failed', err);
      }
    });
}
