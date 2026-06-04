import { Command } from 'commander';
import type { AddCardResult } from '../tui/card-form';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { insertNote } from '../models/note';
import { initializeScheduling } from '../scheduling/service';
import { todayISO } from '../utils/date';

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function createCardFile(
  vaultPath: string,
  cardsDir: string,
  question: string,
  answer: string,
  tags: string[],
): Promise<{ relativePath: string; filePath: string }> {
  const fileDir = cardsDir ? path.join(vaultPath, cardsDir) : vaultPath;
  await fs.mkdir(fileDir, { recursive: true });
  const slug = slugify(question) || 'untitled';
  const fileName = `${slug}.md`;
  const filePath = path.join(fileDir, fileName);

  const today = todayISO();
  const tagsLine = tags.length > 0 ? `tags: [${tags.join(', ')}]\n` : '';
  const frontmatter = [
    '---',
    `title: ${question}`,
    `created: ${today}`,
    tagsLine,
    '---',
    '',
    answer,
  ].filter(Boolean).join('\n');

  await fs.writeFile(filePath, frontmatter, 'utf-8');

  const relativePath = cardsDir ? path.join(cardsDir, fileName) : fileName;
  return { relativePath, filePath };
}

export function buildAddCommand(): Command {
  return new Command('add')
    .description('Create a new card')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--title <title>', 'Card question (non-interactive mode)')
    .option('--content <content>', 'Card answer (non-interactive mode)')
    .option('--tags <tags>', 'Comma-separated tags (non-interactive mode)')
    .action(async (vaultPath: string, options: { title?: string; content?: string; tags?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        let question: string;
        let answer: string;
        let tags: string[];

        if (options.title && options.content) {
          question = options.title;
          answer = options.content;
          tags = options.tags ? options.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        } else if (process.stdout.isTTY) {
          const { showAddCardForm } = await import('../tui/card-form');
          const result = await new Promise<{ title: string; content: string; tags: string } | null>(
            (resolve) => {
              showAddCardForm(
                config.cardsDir || 'vault root',
                (card: AddCardResult) => resolve(card),
                () => resolve(null),
              );
            },
          );
          if (!result) { closeDb(); return; }
          question = result.title;
          answer = result.content;
          tags = result.tags ? result.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        } else {
          throw new Error('Non-interactive mode requires --title and --content');
        }

        const { relativePath, filePath } = await createCardFile(vaultPath, config.cardsDir, question, answer, tags);
        const today = todayISO();
        const note = {
          id: relativePath,
          path: relativePath,
          title: question,
          content: answer,
          word_count: answer.split(/\s+/).filter(Boolean).length,
          created_at: today,
          updated_at: today,
          tags: JSON.stringify(tags),
        };

        insertNote(db, note);
        initializeScheduling(db, note.id);
        saveDb(vaultPath);
        closeDb();
        console.log(`Card created: ${filePath}`);
      } catch (err) {
        handleError('Failed to create card', err);
      }
    });
}
