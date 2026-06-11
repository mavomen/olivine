import inquirer from 'inquirer';
import type { Database } from 'sql.js';
import { getSchedulingForNote } from '../models/scheduling';

const QUALITY_LABELS: Record<string, { name: string; value: number }[]> = {
  leitner: [
    { name: '0 — Wrong — demoted to Box 1', value: 0 },
    { name: '1 — Wrong', value: 1 },
    { name: '2 — Wrong', value: 2 },
    { name: '3 — Correct — promoted', value: 3 },
    { name: '4 — Correct', value: 4 },
    { name: '5 — Correct', value: 5 },
  ],
  sm2: [
    { name: '0 — Complete blackout', value: 0 },
    { name: '1 — Incorrect, but remembered seen before', value: 1 },
    { name: '2 — Incorrect, but correct felt easy', value: 2 },
    { name: '3 — Recalled with serious difficulty', value: 3 },
    { name: '4 — Recalled with some hesitation', value: 4 },
    { name: '5 — Perfect recall', value: 5 },
  ],
  fsrs: [
    { name: '0 — Forgot (grade 1)', value: 0 },
    { name: '1 — Forgot', value: 1 },
    { name: '2 — Hard (grade 2)', value: 2 },
    { name: '3 — Good (grade 3)', value: 3 },
    { name: '4 — Easy (grade 4)', value: 4 },
    { name: '5 — Easy', value: 5 },
  ],
};

/**
 * Resolve the algorithm name for a note, checking override first then stored value.
 */
function resolveAlgorithm(db: Database, noteId: string, algorithmOverride?: string): string {
  if (algorithmOverride) return algorithmOverride;
  const sched = getSchedulingForNote(db, noteId);
  return sched?.algorithm ?? 'leitner';
}

/**
 * Prompts the user to press Enter to reveal the note content.
 * @param title - The note title to display in the prompt
 */
export async function promptReveal(title: string): Promise<void> {
  await inquirer.prompt([
    {
      type: 'input',
      name: 'reveal',
      message: `Review: "${title}" — Press Enter to reveal`,
    },
  ]);
}

/**
 * Prompts the user to rate their recall quality on a 0-5 scale.
 * Labels adapt to the scheduling algorithm for clearer feedback.
 * @param db - Database instance (used to resolve algorithm)
 * @param noteId - The note being reviewed
 * @param algorithmOverride - Optional override algorithm name
 * @returns The quality rating 0-5
 */
export async function promptQuality(db: Database, noteId: string, algorithmOverride?: string): Promise<number> {
  if (!process.stdout.isTTY) {
    throw new Error('Interactive prompt requires a TTY. Use --quality <n> to specify a rating non-interactively.');
  }
  const algorithm = resolveAlgorithm(db, noteId, algorithmOverride);
  const labels = QUALITY_LABELS[algorithm] ?? QUALITY_LABELS.sm2;
  const { quality } = await inquirer.prompt([
    {
      type: 'list',
      name: 'quality',
      message: `How well did you recall? (${algorithm})`,
      choices: labels,
      default: 3,
    },
  ]);
  return quality;
}
