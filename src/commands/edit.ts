import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getAllNotes, insertNote } from '../models/note';
import { todayISO } from '../utils/date';

export function buildEditCommand(): Command {
  return new Command('edit')
    .description('Edit an existing card')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        if (notes.length === 0) {
          console.log('No cards found. Use `olivine add` to create some.');
          closeDb();
          return;
        }

        const { default: inquirer } = await import('inquirer');
        const { noteId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'noteId',
            message: 'Select a card to edit:',
            choices: notes.map((n) => ({ name: n.title, value: n.id })),
            pageSize: 15,
          },
        ]);

        const note = notes.find((n) => n.id === noteId);
        if (!note) {
          closeDb();
          return;
        }

        const { showAddCardForm } = await import('../session/tui-add');
        const result = await new Promise<{ title: string; content: string } | null>(
          (resolve) => {
            showAddCardForm(
              config.cardsDir || 'vault root',
              (card) => resolve(card),
              () => resolve(null),
              note.title,
              note.content,
            );
          },
        );

        if (!result) {
          closeDb();
          return;
        }

        const filePath = path.join(vaultPath, note.path);
        const today = todayISO();
        const frontmatter = [
          '---',
          `title: ${result.title}`,
          `created: ${note.created_at}`,
          `updated: ${today}`,
          '---',
          '',
          result.content,
        ].join('\n');

        await fs.writeFile(filePath, frontmatter, 'utf-8');

        insertNote(db, {
          id: note.id,
          path: note.path,
          title: result.title,
          content: result.content,
          word_count: result.content.split(/\s+/).filter(Boolean).length,
          created_at: note.created_at,
          updated_at: today,
          tags: note.tags || '[]',
        });

        saveDb(vaultPath);
        closeDb();
        console.log(`Card updated: ${filePath}`);
      } catch (err) {
        handleError('Edit failed', err);
      }
    });
}
