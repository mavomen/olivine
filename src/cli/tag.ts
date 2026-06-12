import { Command } from 'commander';
import { Database } from 'sql.js';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes, getNotesByTag } from '../models/note';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

interface TagCount {
  tag: string;
  count: number;
}

function getTagCounts(db: Database): TagCount[] {
  const counts = new Map<string, number>();
  const notes = getAllNotes(db);

  for (const note of notes) {
    let tags: string[];
    try {
      tags = JSON.parse(note.tags || '[]');
    } catch {
      continue;
    }
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function formatTagOutput(tagCounts: TagCount[], totalNotes: number): string {
  if (tagCounts.length === 0) return 'No tags found.';

  const lines = [`Tags across ${totalNotes} note(s):\n`];
  for (const { tag, count } of tagCounts) {
    const label = count === 1 ? 'card' : 'cards';
    lines.push(`  ${tag} ${count} ${label}`);
  }
  return lines.join('\n');
}

export function buildTagCommand(): Command {
  return new Command('tag')
    .description('List all tags with card counts, or show cards with a specific tag')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .argument('[tagname]', 'Show cards with this specific tag')
    .option('--json', 'Output tags as JSON')
    .action(async (vaultPath: string, tagname: string | undefined, options: { json?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        if (tagname) {
          const notes = getNotesByTag(db, tagname);
          if (options.json) {
            console.log(JSON.stringify({ tag: tagname, notes: notes.map(n => ({ id: n.id, title: n.title })) }, null, 2));
          } else {
            if (notes.length === 0) {
              console.log(`No cards with tag "${tagname}".`);
            } else {
              console.log(`Cards with tag "${tagname}" (${notes.length}):\n`);
              for (const note of notes) {
                console.log(`  ${note.id}: ${note.title}`);
              }
            }
          }
        } else {
          const allNotes = getAllNotes(db);
          const tagCounts = getTagCounts(db);

          if (options.json) {
            console.log(JSON.stringify({ totalNotes: allNotes.length, tags: tagCounts }, null, 2));
          } else {
            console.log(formatTagOutput(tagCounts, allNotes.length));
          }
        }

        closeDb();
      } catch (err) {
        handleError('Tag command failed', err);
      }
    });
}
