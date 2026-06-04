import { Command } from 'commander';
import { loadConfig, saveConfig } from '../config/loader';
import { handleError } from '../utils/error';
import { validateVaultPath } from '../utils/validation';

export function buildConfigCommand(): Command {
  return new Command('config')
    .description('View or update configuration')
    .argument('<vaultPath>', 'Path to the Obsidian vault')
    .option('--set <key=value>', 'Set a config value (cardsDir=...)')
    .action(async (vaultPath: string, options: { set?: string }) => {
      try {
        await validateVaultPath(vaultPath);
        const config = await loadConfig(vaultPath);

        if (options.set) {
          const match = options.set.match(/^(\w+)=(.+)$/);
          if (!match) {
            throw new Error('Invalid --set format. Use: --set key=value');
          }
          const [, key, value] = match as [string, string, string];
          if (key !== 'cardsDir') {
            throw new Error(`Unknown config key: ${key}. Supported: cardsDir`);
          }
          (config as unknown as Record<string, string>)[key] = value;
          await saveConfig(vaultPath, config);
          console.log(`Config updated: ${key} = ${value}`);
        } else {
          console.log(JSON.stringify(config, null, 2));
        }
      } catch (err) {
        handleError('Config operation failed', err);
      }
    });
}
