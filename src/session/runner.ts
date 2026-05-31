import chalk from 'chalk';
import { Database } from 'sql.js';
import { ReviewSession, currentNote, applyQuality, advanceNote, sessionDuration, sessionStats } from './state';
import { promptReveal, promptQuality } from './prompter';
import { insertReview } from '../models/review';
import { applyReview } from '../scheduling/service';
import { todayISO } from '../utils/date';

export async function runReviewSession(
  db: Database,
  session: ReviewSession,
): Promise<void> {
  const today = todayISO();
  console.log(chalk.bold(`\nStarting review session — ${session.notes.length} notes due\n`));

  while (session.phase !== 'summary') {
    const sn = currentNote(session);
    if (!sn) break;

    // Progress indicator
    const progress = `[${session.currentIndex + 1}/${session.notes.length}]`;
    console.log(chalk.cyan(`${progress} ${chalk.white(sn.note.title)}`));

    // Reveal answer
    await promptReveal(sn.note.title);
    console.log(chalk.gray('\n--- Content ---'));
    console.log(sn.note.content);
    console.log(chalk.gray('----------------\n'));

    // Quality score
    const quality = await promptQuality();
    applyQuality(session, quality);

    // Persist review and update scheduling
    insertReview(db, sn.note.id, quality, today);
    applyReview(db, sn.note.id, quality, today);

    advanceNote(session);
    console.log(); // spacing
  }

  // Session summary
  const stats = sessionStats(session);
  const duration = sessionDuration(session);
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  console.log(chalk.bold.green('\n=== Session Complete ==='));
  console.log(chalk.white(`Reviewed: ${stats.reviewed}/${stats.total}`));
  console.log(chalk.red(`Failed:   ${stats.failed}`));
  console.log(chalk.gray(`Duration: ${minutes}m ${seconds}s`));
  console.log();
}
