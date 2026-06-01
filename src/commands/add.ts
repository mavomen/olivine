import { Command } from 'commander';
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
): Promise<{ relativePath: string; filePath: string }> {
  const fileDir = cardsDir ? path.join(vaultPath, cardsDir) : vaultPath;
  await fs.mkdir(fileDir, { recursive: true });
  const slug = slugify(question) || 'untitled';
  const fileName = `${slug}.md`;
  const filePath = path.join(fileDir, fileName);

  const today = todayISO();
  const frontmatter = [
    '---',
    `title: ${question}`,
    `created: ${today}`,
    '---',
    '',
    answer,
  ].join('\n');

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
    .action(async (vaultPath: string, options: { title?: string; content?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        let question: string;
        let answer: string;

        if (options.title && options.content) {
          question = options.title;
          answer = options.content;
        } else if (process.stdout.isTTY) {
          const { showAddCardForm } = await import('../session/tui-add');
          const result = await new Promise<{ title: string; content: string } | null>(
            (resolve) => {
              showAddCardForm(
                config.cardsDir || 'vault root',
                (card) => resolve(card),
                () => resolve(null),
              );
            },
          );
          if (!result) {
            closeDb();
            return;
          }
          question = result.title;
          answer = result.content;
        } else {
          throw new Error('Non-interactive mode requires --title and --content');
        }

        const { relativePath, filePath } = await createCardFile(
          vaultPath,
          config.cardsDir,
          question,
          answer,
        );

        const today = todayISO();
        const note = {
          id: relativePath,
          path: relativePath,
          title: question,
          content: answer,
          word_count: answer.split(/\s+/).filter(Boolean).length,
          created_at: today,
          updated_at: today,
          tags: '[]',
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
