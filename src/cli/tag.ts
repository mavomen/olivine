import { Command } from 'commander';
import { Database } from 'sql.js';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { getAllNotes, getNotesByTag, insertNote } from '../models/note';
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

function renameTag(db: Database, oldTag: string, newTag: string): number {
  const notes = getNotesByTag(db, oldTag);
  for (const note of notes) {
    const tags: string[] = JSON.parse(note.tags || '[]');
    const idx = tags.findIndex(t => t === oldTag);
    if (idx !== -1) {
      tags[idx] = newTag;
      note.tags = JSON.stringify(tags);
      insertNote(db, note);
    }
  }
  return notes.length;
}

function deleteTag(db: Database, tag: string): number {
  const notes = getNotesByTag(db, tag);
  for (const note of notes) {
    const tags: string[] = JSON.parse(note.tags || '[]');
    const filtered = tags.filter(t => t !== tag);
    note.tags = JSON.stringify(filtered);
    insertNote(db, note);
  }
  return notes.length;
}

export function buildTagCommand(): Command {
  return new Command('tag')
    .description('List all tags with card counts, or show cards with a specific tag')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .argument('[tagname]', 'Show cards with this specific tag')
    .option('--json', 'Output tags as JSON')
    .option('--rename <old:new>', 'Rename a tag across all cards (e.g. --rename math:mathematics)')
    .option('--delete <tag>', 'Remove a tag from all cards')
    .action(async (vaultPath: string, tagname: string | undefined, options: { json?: boolean; rename?: string; delete?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        if (options.rename) {
          const sepIdx = options.rename.indexOf(':');
          if (sepIdx === -1) throw new Error('Usage: --rename <old>:<new> (e.g. --rename math:mathematics)');
          const oldTag = options.rename.slice(0, sepIdx);
          const newTag = options.rename.slice(sepIdx + 1);
          if (!oldTag || !newTag) throw new Error('Usage: --rename <old>:<new> (e.g. --rename math:mathematics)');
          const count = renameTag(db, oldTag, newTag);
          saveDb(vaultPath);
          closeDb();
          console.log(`Renamed tag "${oldTag}" to "${newTag}" across ${count} card(s).`);
          return;
        }

        if (options.delete) {
          const count = deleteTag(db, options.delete);
          saveDb(vaultPath);
          closeDb();
          console.log(`Removed tag "${options.delete}" from ${count} card(s).`);
          return;
        }

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
