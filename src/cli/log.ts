import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getNoteById } from '../models/note';
import { getSchedulingForNote } from '../models/scheduling';
import { getReviewsForNote } from '../models/review';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import chalk from 'chalk';

export function buildLogCommand(): Command {
  return new Command('log')
    .description('Show review history for a card')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .argument('<noteId>', 'Note ID to show history for')
    .action(async (vaultPath: string, noteId: string) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const note = getNoteById(db, noteId);
        if (!note) {
          closeDb();
          throw new Error(`Card not found: ${noteId}`);
        }

        const sched = getSchedulingForNote(db, noteId);
        const reviews = getReviewsForNote(db, noteId);

        console.log(chalk.bold.yellow('\n' + '═'.repeat(60)));
        console.log(chalk.bold(`  ${note.title}`));
        if (note.tags && note.tags !== '[]') {
          console.log(chalk.dim(`  Tags: ${JSON.parse(note.tags).join(', ')}`));
        }
        console.log();

        if (sched) {
          console.log(chalk.bold('  Current Scheduling:'));
          console.log(`    Box:          ${sched.box}`);
          console.log(`    Interval:     ${sched.interval_days} day(s)`);
          console.log(`    Ease Factor:  ${sched.ease_factor.toFixed(2)}`);
          console.log(`    Due Date:     ${sched.due_date}`);
          console.log(`    Repetitions:  ${sched.repetitions}`);
          console.log(`    Stability:    ${sched.stability.toFixed(2)}`);
          console.log(`    Difficulty:   ${sched.difficulty.toFixed(2)}`);
          console.log(`    Archived:     ${sched.archived ? 'Yes' : 'No'}`);
          console.log(`    Algorithm:    ${sched.algorithm}`);
          if (sched.last_reviewed) console.log(`    Last Review:  ${sched.last_reviewed}`);
          console.log();
        }

        console.log(chalk.bold.magenta('  REVIEW HISTORY:'));
        if (reviews.length === 0) {
          console.log(chalk.gray('  No reviews yet.'));
        } else {
          reviews.forEach((r, i) => {
            const qualityColor = r.quality >= 3 ? 'green' : 'red';
            const reviewNum = reviews.length - i;
            console.log(chalk`    {bold #${reviewNum}}  {bold ${r.reviewed_at}}  quality: {${qualityColor} ${r.quality}}`);
          });
        }

        console.log(chalk.bold.yellow('═'.repeat(60) + '\n'));

        closeDb();
      } catch (err) {
        handleError('Log failed', err);
      }
    });
}
