import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes } from '../models/note';
import { getAllScheduling } from '../models/scheduling';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import chalk from 'chalk';

/** Build and return the `grep` CLI command for searching card content. */
export function buildGrepCommand(): Command {
  return new Command('grep')
    .description('Search cards by question or answer content')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .argument('<pattern>', 'Search pattern (case-insensitive)')
    .action(async (vaultPath: string, pattern: string) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        const scheduling = getAllScheduling(db);
        const schedMap = new Map(scheduling.map(s => [s.note_id, s]));

        const lowerPattern = pattern.toLowerCase();
        const matches = notes.filter(n => {
          const titleLower = n.title.toLowerCase();
          const contentLower = n.content.toLowerCase();
          return titleLower.includes(lowerPattern) || contentLower.includes(lowerPattern);
        });

        if (matches.length === 0) {
          console.log(`No cards matching "${pattern}"`);
          closeDb();
          return;
        }

        console.log(chalk.bold.cyan(`\n${matches.length} card(s) matching "${pattern}":\n`));
        for (const note of matches) {
          const sched = schedMap.get(note.id);
          const box = sched?.box;
          const archived = sched?.archived;
          const status = archived ? chalk.gray(' (archived)') : box ? chalk.dim(` [Box ${box}]`) : '';
          
          const contentDisplay = truncate(highlight(note.content, pattern), 120);
          
          console.log(chalk.yellow(note.title) + status);
          console.log(chalk.gray(`  ${note.path}`));
          console.log(chalk.white(`  ${contentDisplay}`));
          console.log();
        }

        closeDb();
      } catch (err) {
        handleError('Grep failed', err);
      }
    });
}

function highlight(text: string, pattern: string): string {
  const regex = new RegExp(`(${escapeRegex(pattern)})`, 'gi');
  return text.replace(regex, chalk.bold.yellow('$1'));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}
