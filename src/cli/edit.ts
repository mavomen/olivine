import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getAllNotes, getNoteById, insertNote } from '../models/note';
import { todayISO } from '../utils/date';

export function buildEditCommand(): Command {
  return new Command('edit')
    .description('Edit an existing card')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--id <noteId>', 'Edit a specific card by ID')
    .option('--title <title>', 'New title (non-interactive)')
    .option('--content <content>', 'New content (non-interactive)')
    .option('--tags <tags>', 'Comma-separated tags (non-interactive)')
    .action(async (vaultPath: string, options: { id?: string; title?: string; content?: string; tags?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const notes = getAllNotes(db);
        if (notes.length === 0) {
          console.log('No cards found.');
          closeDb();
          return;
        }

        const isTty = !!process.stdout.isTTY;

        if (!options.id && !isTty) {
          throw new Error('Interactive mode requires a TTY. Use --id <noteId> to specify a card.');
        }

        if (!options.id && isTty) {
          const { default: inquirer } = await import('inquirer');
          const { selected } = await inquirer.prompt([{
            type: 'list', name: 'selected', message: 'Select a card to edit:',
            choices: notes.map(n => ({ name: n.title, value: n.id })),
            pageSize: 15,
          }]);
          options.id = selected;
        }

        if (!options.id) throw new Error('No card selected.');

        const note = getNoteById(db, options.id);
        if (!note) throw new Error(`Card not found: ${options.id}`);

        if (!isTty) {
          if (!options.title || !options.content) {
            throw new Error('Non-interactive edit requires --title and --content (and optionally --tags).');
          }

          const tagsArr = options.tags
            ? options.tags.split(',').map(t => t.trim()).filter(Boolean)
            : (() => { try { return JSON.parse(note.tags || '[]'); } catch { return []; } })();

          const filePath = path.join(vaultPath, note.path);
          const today = todayISO();
          const tagsLine = tagsArr.length > 0 ? `tags: [${tagsArr.join(', ')}]\n` : '';
          const frontmatter = [
            '---',
            `title: ${options.title}`,
            `created: ${note.created_at}`,
            `updated: ${today}`,
            tagsLine,
            '---',
            '',
            options.content,
          ].filter(Boolean).join('\n');

          await fs.writeFile(filePath, frontmatter, 'utf-8');

          insertNote(db, {
            id: note.id,
            path: note.path,
            title: options.title,
            content: options.content,
            word_count: options.content.split(/\s+/).filter(Boolean).length,
            created_at: note.created_at,
            updated_at: today,
            tags: JSON.stringify(tagsArr),
          });

          saveDb(vaultPath);
          closeDb();
          console.log(`Card updated: ${filePath}`);
          return;
        }

        const existingTags = (() => {
          try { return JSON.parse(note.tags || '[]').join(', '); }
          catch { return ''; }
        })();

        const { showAddCardForm } = await import('../tui/card-form');
        const result = await new Promise<{ title: string; content: string; tags: string } | null>(resolve => {
          showAddCardForm(
            config.cardsDir || 'vault root',
            card => resolve(card),
            () => resolve(null),
            note.title,
            note.content,
            existingTags,
          );
        });

        if (!result) { closeDb(); return; }

        const filePath = path.join(vaultPath, note.path);
        const today = todayISO();
        const tagsArr = result.tags ? result.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        const tagsLine = tagsArr.length > 0 ? `tags: [${tagsArr.join(', ')}]\n` : '';
        const frontmatter = [
          '---',
          `title: ${result.title}`,
          `created: ${note.created_at}`,
          `updated: ${today}`,
          tagsLine,
          '---',
          '',
          result.content,
        ].filter(Boolean).join('\n');

        await fs.writeFile(filePath, frontmatter, 'utf-8');

        insertNote(db, {
          id: note.id,
          path: note.path,
          title: result.title,
          content: result.content,
          word_count: result.content.split(/\s+/).filter(Boolean).length,
          created_at: note.created_at,
          updated_at: today,
          tags: JSON.stringify(tagsArr),
        });

        saveDb(vaultPath);
        closeDb();
        console.log(`Card updated: ${filePath}`);
      } catch (err) { handleError('Edit failed', err); }
    });
}
