import blessed from 'blessed';
import { Database } from 'sql.js';
import { ReviewSession, currentNote, applyQuality, advanceNote, sessionStats, sessionDuration } from '../../review/session';
import { createCardBox } from './card';
import { insertReview } from '../../models/review';
import { applyReview } from '../../scheduling/service';
import { todayISO } from '../../utils/date';
import { getSchedulingForNote } from '../../models/scheduling';

function formatIntervalLabel(intervalDays: number, dueDate: string): string {
  const today = todayISO();
  const diff = Math.round(
    (new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff > 0) return `due in ${diff}d`;
  if (diff === 0) return 'due today';
  return `overdue by ${Math.abs(diff)}d`;
}

/** Options controlling TUI review session behavior. */
export interface TuiOptions {
  dryRun?: boolean;
  algorithmOverride?: string;
  quality?: number;
}

/**
 * Run an interactive review session in the terminal.
 * @param db - The database instance.
 * @param session - The review session to execute.
 * @param options - Optional configuration overrides.
 * @returns A promise that resolves when the session ends.
 */
export function runTuiSession(db: Database, session: ReviewSession, options: TuiOptions = {}): Promise<void> {
  if (!process.stdout.isTTY) {
    return runFallback(db, session, options);
  }
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: options.dryRun ? 'Olivine — Practice' : 'Olivine — Review',
      dockBorders: false,
    });

    const today = todayISO();
    let cardBox: ReturnType<typeof createCardBox> | null = null;
    let flashing = false;

    function getCurrentSched() {
      const note = currentNote(session);
      if (!note) return undefined;
      return getSchedulingForNote(db, note.note.id);
    }

    function getCurrentBox(): number {
      return getCurrentSched()?.box ?? 1;
    }

    function getCurrentAlgorithm(): string {
      return getCurrentSched()?.algorithm ?? options.algorithmOverride ?? 'leitner';
    }

    function getIntervalLabel(): string | undefined {
      const sched = getCurrentSched();
      if (!sched || sched.interval_days <= 0) return undefined;
      return formatIntervalLabel(sched.interval_days, sched.due_date);
    }

    function renderCard(revealed: boolean = false) {
      const note = currentNote(session);
      if (!note) {
        showSummary();
        return;
      }

      const box = getCurrentBox();
      const algorithm = getCurrentAlgorithm();
      const intervalLabel = getIntervalLabel();

      if (cardBox) cardBox.detach();
      cardBox = createCardBox(
        screen,
        {
          title: note.note.title,
          content: note.note.content,
          revealed,
          index: session.currentIndex + 1,
          total: session.notes.length,
          remaining: session.notes.length - (session.currentIndex + 1),
          box,
          algorithm,
          intervalLabel,
        },
        () => renderCard(true),
        () => renderCard(false),
        (quality) => {
          applyQuality(session, quality);
          if (!options.dryRun) {
            insertReview(db, note.note.id, quality, today);
            applyReview(db, note.note.id, quality, today, options.algorithmOverride);
          }
          if (cardBox && !flashing) {
            flashing = true;
            cardBox.style.border = { fg: quality >= 3 ? 'green' : 'red' };
            screen.render();
            setTimeout(() => {
              flashing = false;
              advanceNote(session);
              renderCard(false);
            }, 600);
          } else {
            advanceNote(session);
            renderCard(false);
          }
        },
        () => {
          const confirm = blessed.question({
            parent: screen,
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: 'shrink',
            border: 'line',
            style: { border: { fg: 'yellow' }, bg: 'black' },
          });
          confirm.ask('Quit review? Progress for unreviewed cards will be lost. (y/N):', (_err: Error | null, value: string) => {
            if (value?.toLowerCase() === 'y') {
              confirm.destroy();
              showSummary();
            } else {
              confirm.destroy();
              screen.render();
            }
          });
        },
      );
      cardBox.focus();
      screen.render();
    }

    function showSummary() {
      if (cardBox) cardBox.detach();

      const stats = sessionStats(session);
      const duration = sessionDuration(session);
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      const label = options.dryRun ? ' Practice Complete' : ' Session Complete';
      const remainingLines = session.remainingDue > 0
        ? [`${session.remainingDue} more card(s) due today`]
        : [];

      const container = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '60%',
        height: '70%',
        border: 'line',
        style: { border: { fg: 'green' } },
      });

      blessed.box({
        parent: container,
        top: 0,
        left: 1,
        right: 1,
        height: 4,
        content: [
          label,
          ` Reviewed: ${stats.reviewed}/${stats.total}    Failed: ${stats.failed}`,
          ` Duration: ${minutes}m ${seconds}s${options.dryRun ? ' (practice)' : ''}`,
          ...remainingLines,
        ].join('\n'),
        style: { bold: true },
      });

      const listItems = session.notes.map((sn) => {
        let icon: string;
        if (!sn.reviewed) {
          icon = '{yellow-fg}—{/yellow-fg}';
        } else if (sn.quality !== null && sn.quality >= 3) {
          icon = '{green-fg}✓{/green-fg}';
        } else {
          icon = '{red-fg}✗{/red-fg}';
        }
        const title = sn.note.title.length > 60
          ? sn.note.title.slice(0, 60) + '…'
          : sn.note.title;
        return `${icon} ${title}`;
      });

      const list = blessed.list({
        parent: container,
        top: 4,
        left: 1,
        right: 1,
        bottom: 1,
        items: listItems,
        tags: true,
        keys: true,
        vi: true,
        style: {
          selected: { fg: 'white', bg: 'blue' },
        },
      });

      blessed.box({
        parent: container,
        bottom: 0,
        left: 1,
        right: 1,
        height: 1,
        content: ' Press q to exit  (↑↓ to scroll)',
        style: { fg: 'cyan' },
      });

      screen.key(['q', 'escape', 'C-c'], () => {
        screen.destroy();
        resolve();
      });

      list.focus();
      screen.render();
    }

    screen.key(['escape'], () => {
      if (!cardBox) {
        screen.destroy();
        resolve();
      }
    });

    renderCard(false);
  });
}

async function runFallback(db: Database, session: ReviewSession, options: TuiOptions = {}): Promise<void> {
  const today = todayISO();
  const q = options.quality ?? 4;
  for (const sn of session.notes) {
    if (sn.reviewed) continue;
    if (!options.dryRun) {
      insertReview(db, sn.note.id, q, today);
      applyReview(db, sn.note.id, q, today, options.algorithmOverride);
    }
    sn.quality = q;
    sn.reviewed = true;
    session.currentIndex++;
  }
  session.phase = 'summary';
  if (session.remainingDue > 0) {
    console.log(`${session.remainingDue} more card(s) due today.`);
  }
}
