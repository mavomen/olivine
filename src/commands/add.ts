import { Command } from 'commander';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { showAddCardForm } from '../session/tui-add';
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

export function buildAddCommand(): Command {
  return new Command('add')
    .description('Create a new card')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        const result = await new Promise<{ title: string; content: string } | null>(
          (resolve) => {
            showAddCardForm(
              (card) => resolve(card),
              () => resolve(null),
            );
          },
        );

        if (!result) {
          closeDb();
          return;
        }

        const fileDir = config.cardsDir
          ? path.join(vaultPath, config.cardsDir)
          : vaultPath;
        await fs.mkdir(fileDir, { recursive: true });

        const slug = slugify(result.title) || 'untitled';
        const fileName = `${slug}.md`;
        const filePath = path.join(fileDir, fileName);

        const today = todayISO();
        const frontmatter = [
          '---',
          `title: ${result.title}`,
          `created: ${today}`,
          '---',
          '',
          result.content,
        ].join('\n');

        await fs.writeFile(filePath, frontmatter, 'utf-8');

        const relativePath = config.cardsDir
          ? path.join(config.cardsDir, fileName)
          : fileName;

        const note = {
          id: relativePath,
          path: relativePath,
          title: result.title,
          content: result.content,
          word_count: result.content.split(/\s+/).filter(Boolean).length,
          created_at: today,
          updated_at: today,
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
