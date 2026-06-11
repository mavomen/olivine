import blessed from 'blessed';
import { Database } from 'sql.js';
import { getStats, type StatsSnapshot } from '../../stats/formatter';

const BAR_CHARS = '█';

export function renderBar(maxVal: number, count: number, width: number): string {
  if (maxVal === 0) return '';
  const filled = Math.round((count / maxVal) * width);
  return BAR_CHARS.repeat(Math.max(filled, count > 0 ? 1 : 0));
}

export function buildContent(stats: StatsSnapshot, termWidth: number): string {
  const maxCount = Math.max(...Object.values(stats.boxDistribution), 1);
  const barWidth = Math.max(10, termWidth - 30);

  const boxLines = Object.entries(stats.boxDistribution)
    .map(([box, count]) => {
      const bar = renderBar(maxCount, count, barWidth);
      return `  Box ${box}  ${bar} ${count}`;
    })
    .join('\n');

  return [
    ` Total notes:  ${stats.totalNotes}         Due today:  ${stats.dueNotes}`,
    ` Reviewed:     ${stats.reviewedToday}       Streak:     ${stats.streak} day(s)`,
    ` Total reviews: ${stats.totalReviews}       Archived:   ${stats.archivedCount}`,
    '',
    ' Box Distribution:',
    boxLines,
    '',
    ' [r] refresh  [t] filter by tag  [q] quit',
  ].join('\n');
}

export function openStatsTui(vaultPath: string, db: Database, initialTag?: string): void {
  process.stdout.write('\x1b[2J\x1b[0;0H');

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Olivine — Statistics',
    dockBorders: false,
  });

  let currentTag: string | undefined = initialTag;

  function render() {
    const stats = getStats(db, currentTag);
    const termWidth = (screen.width as number) || 80;

    const content = buildContent(stats, termWidth);

    blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      border: 'line',
      style: { border: { fg: 'cyan' }, bg: 'black' },
      content,
      tags: false,
    });

    screen.render();
  }

  screen.key(['r'], () => {
    screen.children.forEach(c => c.detach());
    render();
  });

  screen.key(['t'], () => {
    const prompt = blessed.prompt({
      parent: screen,
      top: 'center',
      left: 'center',
      height: 'shrink',
      width: 'shrink',
      border: 'line',
      style: { border: { fg: 'yellow' }, bg: 'black' },
    });

    prompt.input('Filter by tag (or blank for all):', currentTag ?? '', (_err: Error | null, value: string) => {
      currentTag = value || undefined;
      prompt.destroy();
      screen.children.forEach(c => c.detach());
      render();
    });
  });

  screen.key(['q', 'escape', 'C-c'], () => {
    screen.destroy();
    process.stdout.write('\x1b[?25h');
    process.exit(0);
  });

  render();
}
