import blessed from 'blessed';
import { Database } from 'sql.js';
import { ReviewSession, currentNote, applyQuality, advanceNote, sessionStats, sessionDuration } from './state';
import { createCardBox } from './tui-card';
import { insertReview } from '../models/review';
import { applyReview } from '../scheduling/service';
import { todayISO } from '../utils/date';
import { streak } from '../stats/calculator';

export function runTuiSession(db: Database, session: ReviewSession): Promise<void> {
  if (!process.stdout.isTTY) {
    return runFallback(db, session);
  }
  return new Promise((resolve) => {
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Olivine Review',
      dockBorders: false,
    });

    const today = todayISO();
    let currentStreak = streak(db, today);
    let cardBox: ReturnType<typeof createCardBox> | null = null;

    function renderCard(revealed: boolean = false) {
      const note = currentNote(session);
      if (!note) {
        showSummary();
        return;
      }

      if (cardBox) cardBox.detach();
      cardBox = createCardBox(
        screen,
        {
          title: note.note.title,
          content: note.note.content,
          revealed,
          index: session.currentIndex + 1,
          total: session.notes.length,
          streak: currentStreak,
        },
        () => renderCard(true), // reveal
        () => renderCard(false), // unreveal
        (quality) => {
          applyQuality(session, quality);
          insertReview(db, note.note.id, quality, today);
          applyReview(db, note.note.id, quality, today);
          // Update streak after each review
          currentStreak = streak(db, today);
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

      const msg = blessed.box({
        parent: screen,
        top: 'center',
        left: 'center',
        width: '50%',
        height: 10,
        border: 'line',
        style: { border: { fg: 'green' } },
        content: [
          ' Session Complete',
          ' ────────────────',
          ` Reviewed: ${stats.reviewed}/${stats.total}`,
          ` Failed:   ${stats.failed}`,
          ` Duration: ${minutes}m ${seconds}s`,
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

async function runFallback(db: Database, session: ReviewSession): Promise<void> {
  const today = todayISO();
  for (const sn of session.notes) {
    insertReview(db, sn.note.id, 4, today);
    applyReview(db, sn.note.id, 4, today);
    sn.quality = 4;
    sn.reviewed = true;
    session.currentIndex++;
  }
  session.phase = 'summary';
}
