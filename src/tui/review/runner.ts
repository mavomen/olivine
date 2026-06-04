import blessed from 'blessed';
import { Database } from 'sql.js';
import { ReviewSession, currentNote, applyQuality, advanceNote, sessionStats, sessionDuration } from '../../review/session';
import { createCardBox } from './card';
import { insertReview } from '../../models/review';
import { applyReview } from '../../scheduling/service';
import { todayISO } from '../../utils/date';
import { getSchedulingForNote } from '../../models/scheduling';

export interface TuiOptions {
  dryRun?: boolean;
}

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

    function getCurrentBox(): number {
      const note = currentNote(session);
      if (!note) return 1;
      const sched = getSchedulingForNote(db, note.note.id);
      return sched?.box ?? 1;
    }

    function renderCard(revealed: boolean = false) {
      const note = currentNote(session);
      if (!note) {
        showSummary();
        return;
      }

      const box = getCurrentBox();

      if (cardBox) cardBox.detach();
      cardBox = createCardBox(
        screen,
        {
          title: note.note.title,
          content: note.note.content,
          revealed,
          index: session.currentIndex + 1,
          total: session.notes.length,
          box,
        },
        () => renderCard(true),
        () => renderCard(false),
        (quality) => {
          applyQuality(session, quality);
          if (!options.dryRun) {
            insertReview(db, note.note.id, quality, today);
            applyReview(db, note.note.id, quality, today);
          }
          advanceNote(session);
          renderCard(false);
        },
        () => showSummary(),
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

      const msg = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 12,
        border: 'line',
        style: { border: { fg: 'green' } },
        content: [
          label,
          ' ────────────────',
          ` Reviewed: ${stats.reviewed}/${stats.total}`,
          ` Failed:   ${stats.failed}`,
          ` Duration: ${minutes}m ${seconds}s`,
          options.dryRun ? ' (practice — no changes saved)' : '',
          '',
          ' All caught up!',
          '',
          ' Press q to exit',
        ].join('\n'),
      });

      screen.key(['q', 'escape', 'C-c'], () => {
        screen.destroy();
        resolve();
      });

      msg.focus();
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
  for (const sn of session.notes) {
    if (sn.reviewed) continue;
    if (!options.dryRun) {
      insertReview(db, sn.note.id, 4, today);
      applyReview(db, sn.note.id, 4, today);
    }
    sn.quality = 4;
    sn.reviewed = true;
    session.currentIndex++;
  }
  session.phase = 'summary';
}
