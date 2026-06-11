import inquirer from 'inquirer';

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
 * @returns The quality rating
 */
export async function promptQuality(): Promise<number> {
  if (!process.stdout.isTTY) {
    throw new Error('Interactive prompt requires a TTY. Use --quality <n> to specify a rating non-interactively.');
  }
  const { quality } = await inquirer.prompt([
    {
      type: 'list',
      name: 'quality',
      message: 'How well did you recall this note?',
      choices: [
        { name: '0 — Complete blackout', value: 0 },
        { name: '1 — Incorrect, but remembered seen before', value: 1 },
        { name: '2 — Incorrect, but correct felt easy', value: 2 },
        { name: '3 — Recalled with serious difficulty', value: 3 },
        { name: '4 — Recalled with some hesitation', value: 4 },
        { name: '5 — Perfect recall', value: 5 },
      ],
      default: 3,
    },
  ]);
  return quality;
}
