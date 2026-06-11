import { Command } from 'commander';
import { getDb, saveDb, closeDb } from '../database/connection';
import { bootstrapDatabase } from '../database/bootstrap';
import { ensureOlivineDir } from '../config/initializer';
import { saveConfig, defaultConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';
import { listAlgorithms } from '../scheduling/registry';

/** Build and return the `init` CLI command for initializing Olivine in a vault directory. */
export function buildInitCommand(): Command {
  return new Command('init')
    .description('Initialize Olivine in a vault directory')
    .argument('[vaultPath]', 'Path to the Obsidian vault (defaults to current directory)')
    .option('--algo <algorithm>', `Algorithm to use (${listAlgorithms().join(', ')})`)
    .action(async (vaultPath: string | undefined, options: { algo?: string }) => {
      try {
        vaultPath = vaultPath || process.cwd();
        console.log(`  Using vault: ${vaultPath}`);
        await validateVaultPath(vaultPath);

        let algorithm: string;
        let cardsDir = '';

        const isInteractive = !!process.stdout.isTTY && !!process.stdin.isTTY;

        if (options.algo) {
          if (!listAlgorithms().includes(options.algo)) {
            throw new Error(`Invalid algorithm: ${options.algo}. Supported: ${listAlgorithms().join(', ')}`);
          }
          algorithm = options.algo;
        } else if (isInteractive) {
          const { default: inquirer } = await import('inquirer');

          console.log(`\n  Initializing Olivine in ${vaultPath}\n`);

          const { algo } = await inquirer.prompt([{
            type: 'list',
            name: 'algo',
            message: 'Which algorithm would you like to use?',
            choices: [
              { name: 'leitner  (7-box Leitner system)', value: 'leitner' },
              { name: 'sm2      (SM-2 algorithm, used by Anki/SuperMemo)', value: 'sm2' },
            ],
            default: 'leitner',
          }]);
          algorithm = algo;

          const { dir } = await inquirer.prompt([{
            type: 'input',
            name: 'dir',
            message: 'Cards directory (relative to vault root, or blank for root):',
            default: '',
          }]);
          cardsDir = dir;
        } else {
          algorithm = 'leitner';
        }

        await ensureOlivineDir(vaultPath);
        const db = await getDb(vaultPath);
        bootstrapDatabase(db);
        saveDb(vaultPath);
        closeDb();

        const config = defaultConfig();
        config.vaultPath = vaultPath;
        config.algorithm = algorithm;
        config.cardsDir = cardsDir;
        await saveConfig(vaultPath, config);

        console.log(`\n  \u2713 Initialized Olivine in ${vaultPath} (algorithm: ${algorithm})\n`);
      } catch (err) {
        handleError('Failed to initialize', err);
      }
    });
}
