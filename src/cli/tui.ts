import { Command } from 'commander';
import { getDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { getStats } from '../stats/formatter';

export function buildTuiCommand(): Command {
  return new Command('tui')
    .description('Open the Olivine terminal dashboard')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .action(async (vaultPath: string) => {
      try {
        await validateVaultPath(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        if (!process.stdout.isTTY) {
          throw new Error('TUI dashboard requires a TTY.');
        }

        const { default: blessed } = await import('blessed');
        const stats = getStats(db);
        closeDb();

        const screen = blessed.screen({
          smartCSR: true,
          title: 'Olivine — Dashboard',
          dockBorders: false,
        });

        const box = blessed.box({
          parent: screen,
          top: 'center',
          left: 'center',
          width: 60,
          height: 16,
          border: 'line',
          style: { border: { fg: 'cyan' }, bg: 'black' },
          tags: false,
        });

        blessed.text({
          parent: box,
          top: 1,
          left: 2,
          content: '{bold}Olivine{/bold}',
          tags: true,
          style: { fg: 'yellow', bold: true },
        });

        blessed.text({
          parent: box,
          top: 3,
          left: 2,
          content: `  Due today:    {bold}${stats.dueNotes}{/bold}`,
          tags: true,
          style: { fg: 'white' },
        });

        blessed.text({
          parent: box,
          top: 4,
          left: 2,
          content: `  Total notes:  {bold}${stats.totalNotes}{/bold}`,
          tags: true,
          style: { fg: 'white' },
        });

        blessed.text({
          parent: box,
          top: 5,
          left: 2,
          content: `  Archived:     {bold}${stats.archivedCount}{/bold}`,
          tags: true,
          style: { fg: 'white' },
        });

        blessed.text({
          parent: box,
          top: 6,
          left: 2,
          content: `  Reviewed:     {bold}${stats.reviewedToday}{/bold} today`,
          tags: true,
          style: { fg: 'white' },
        });

        blessed.text({
          parent: box,
          top: 8,
          left: 2,
          content: '────────────────────────────',
          style: { fg: 'cyan' },
        });

        blessed.text({
          parent: box,
          top: 10,
          left: 2,
          content: '  {cyan-fg}[r]{/cyan-fg} Review due cards  {cyan-fg}[b]{/cyan-fg} Browse  {cyan-fg}[s]{/cyan-fg} Stats',
          tags: true,
          style: { fg: 'white' },
        });

        blessed.text({
          parent: box,
          top: 11,
          left: 2,
          content: '  {cyan-fg}[a]{/cyan-fg} Add card       {cyan-fg}[q]{/cyan-fg} Quit',
          tags: true,
          style: { fg: 'white' },
        });

        screen.key(['q', 'escape', 'C-c'], () => {
          screen.destroy();
          process.exit(0);
        });

        screen.key(['r'], () => {
          screen.destroy();
          (async () => {
            const { runTuiSession } = await import('../tui/review/runner');
            const { loadDueSession } = await import('../review/loader');
            const db2 = await getDb(vaultPath);
            bootstrapDatabase(db2);
            const session = loadDueSession(db2);
            if (!session) {
              console.log('All caught up! No notes due for review.');
              process.exit(0);
            }
            await runTuiSession(db2, session);
            process.exit(0);
          })();
        });

        screen.key(['b'], () => {
          screen.destroy();
          (async () => {
            const { openBrowseTui } = await import('../tui/browse');
            const db2 = await getDb(vaultPath);
            bootstrapDatabase(db2);
            openBrowseTui(vaultPath, db2);
          })();
        });

        screen.key(['s'], () => {
          screen.destroy();
          (async () => {
            const { openStatsTui } = await import('../tui/stats');
            const db2 = await getDb(vaultPath);
            bootstrapDatabase(db2);
            openStatsTui(vaultPath, db2);
          })();
        });

        screen.key(['a'], () => {
          screen.destroy();
          (async () => {
            const { showAddCardForm } = await import('../tui/card-form');
            const { insertNote } = await import('../models/note');
            const { initializeScheduling } = await import('../scheduling/service');
            const { saveDb } = await import('../database/connection');
            const db2 = await getDb(vaultPath);
            bootstrapDatabase(db2);

            showAddCardForm(
              'vault root',
              (result: { title: string; content: string; tags: string }) => {
                const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64);
                const id = slug + '.md';
                const today = new Date().toISOString().split('T')[0]!;
                insertNote(db2, {
                  id,
                  path: id,
                  title: result.title,
                  content: result.content,
                  word_count: result.content.split(/\s+/).filter(Boolean).length,
                  created_at: today,
                  updated_at: today,
                  tags: JSON.stringify(result.tags ? result.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
                });
                initializeScheduling(db2, id);
                saveDb(vaultPath);
                setImmediate(async () => {
                  const { openBrowseTui } = await import('../tui/browse');
                  openBrowseTui(vaultPath, db2);
                });
              },
              () => process.exit(0),
            );
          })();
        });

        screen.render();
      } catch (err) {
        handleError('TUI failed', err);
      }
    });
}
