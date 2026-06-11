import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { loadConfig, saveConfig } from '../config/loader';
import { getAllScheduling } from '../models/scheduling';
import { getAlgorithm, listAlgorithms } from '../scheduling/registry';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { todayISO } from '../utils/date';

/** Build and return the `migrate` CLI command for migrating cards between algorithms. */
export function buildMigrateCommand(): Command {
  return new Command('migrate')
    .description('Migrate cards from one algorithm to another')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--algo <algorithm>', `Target algorithm (${listAlgorithms().join(', ')})`)
    .option('--force', 'Skip confirmation prompt')
    .action(async (vaultPath: string, options: { algo?: string; force?: boolean }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);
        const currentAlgo = config.algorithm;
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);

        let targetAlgo: string;

        const isInteractive = !!process.stdout.isTTY && !!process.stdin.isTTY;

        if (options.algo) {
          targetAlgo = options.algo;
        } else if (isInteractive) {
          const choices = listAlgorithms()
            .filter(a => a !== currentAlgo)
            .map(a => {
              const desc = a === 'leitner'
                ? '  (7-box Leitner system)'
                : a === 'sm2'
                  ? '  (SM-2 algorithm, used by Anki/SuperMemo)'
                  : '';
              return { name: `${a}${desc}`, value: a };
            });

          const { default: inquirer } = await import('inquirer');
          const { algo } = await inquirer.prompt([{
            type: 'list',
            name: 'algo',
            message: `Current algorithm: ${currentAlgo}. Which algorithm would you like to migrate to?`,
            choices,
          }]);
          targetAlgo = algo;
        } else {
          throw new Error('Interactive mode requires a TTY. Use --algo to specify the target algorithm non-interactively.');
        }

        if (!listAlgorithms().includes(targetAlgo)) {
          throw new Error(`Invalid algorithm: ${targetAlgo}. Supported: ${listAlgorithms().join(', ')}`);
        }

        if (targetAlgo === currentAlgo) {
          console.log(`Already using ${currentAlgo} — nothing to migrate.`);
          closeDb();
          return;
        }

        const allScheduling = getAllScheduling(db);
        const activeCards = allScheduling.filter(s => s.archived === 0);
        const archivedCards = allScheduling.length - activeCards.length;

        if (activeCards.length === 0) {
          console.log('No active cards to migrate.');
          await saveConfig(vaultPath, { ...config, algorithm: targetAlgo });
          console.log(`Default algorithm updated to ${targetAlgo}.`);
          closeDb();
          return;
        }

        const proceed = options.force || (isInteractive && await confirmMigration(activeCards.length, archivedCards, currentAlgo, targetAlgo));
        if (!proceed) {
          if (!options.force && !isInteractive) {
            throw new Error('Migration requires confirmation. Use --force to skip the prompt.');
          }
          console.log('Migration cancelled.');
          closeDb();
          return;
        }

        const algoImpl = getAlgorithm(targetAlgo);
        const initialState = algoImpl.initialState();
        const today = todayISO();

        for (const s of activeCards) {
          db.run(
            `UPDATE scheduling SET
               algorithm = ?,
               box = ?,
               ease_factor = ?,
               repetitions = ?,
               interval_days = ?,
               due_date = ?,
               last_reviewed = NULL,
               archived = 0
             WHERE note_id = ?`,
            [targetAlgo, initialState.box, initialState.easeFactor, initialState.repetitions, initialState.intervalDays, today, s.note_id],
          );
        }

        await saveConfig(vaultPath, { ...config, algorithm: targetAlgo });
        saveDb(vaultPath);
        closeDb();

        const archivedNote = archivedCards > 0 ? ` (${archivedCards} archived cards skipped)` : '';
        console.log(`\n  \u2713 Migrated ${activeCards.length} cards from ${currentAlgo} to ${targetAlgo}${archivedNote}\n`);
      } catch (err) {
        handleError('Migration failed', err);
      }
    });
}

async function confirmMigration(
  activeCount: number,
  archivedCount: number,
  currentAlgo: string,
  targetAlgo: string,
): Promise<boolean> {
  const { default: inquirer } = await import('inquirer');

  console.log(`\n  Current algorithm: ${currentAlgo}`);
  console.log(`  Active cards: ${activeCount}  (${archivedCount} archived — will be skipped)\n`);
  console.log(`  \u26A0  Migration will reset scheduling state for ${activeCount} active cards.`);
  console.log(`     Each card will be treated as "new" by ${targetAlgo}.\n`);

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Are you sure you want to continue?',
    default: false,
  }]);

  return confirm;
}
