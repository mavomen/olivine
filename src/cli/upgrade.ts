import { Command } from 'commander';
import https from 'node:https';
import { execSync } from 'node:child_process';
import { handleError } from '../utils/error';

const currentVersion = '0.5.0';

interface NpmVersionResponse {
  'dist-tags': { latest: string };
}

function fetchLatestVersion(): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      'https://registry.npmjs.org/olivine/latest',
      { timeout: 10000 },
      (res) => {
        let data = '';
        res.on('data', (chunk: string) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as NpmVersionResponse;
            resolve(parsed['dist-tags']?.latest ?? 'unknown');
          } catch {
            reject(new Error('Failed to parse npm response'));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function buildUpgradeCommand(): Command {
  return new Command('upgrade')
    .description('Check for newer version of Olivine')
    .action(async () => {
      try {
        console.log(`Current version: v${currentVersion}`);
        console.log('Checking npm registry...');

        const latest = await fetchLatestVersion();

        if (latest === 'unknown') {
          console.log('Could not determine latest version from npm.');
          return;
        }

        console.log(`Latest version:  v${latest}`);

        if (compareVersions(latest, currentVersion) > 0) {
          console.log(`\nA newer version (v${latest}) is available!`);
          const isInteractive = !!process.stdout.isTTY && !!process.stdin.isTTY;
          if (isInteractive) {
            const { default: inquirer } = await import('inquirer');
            const { proceed } = await inquirer.prompt([{
              type: 'confirm',
              name: 'proceed',
              message: `Upgrade from v${currentVersion} to v${latest}?`,
              default: true,
            }]);
            if (proceed) {
              console.log('Running: npm install -g olivine@latest');
              execSync('npm install -g olivine@latest', { stdio: 'inherit' });
              console.log('Upgrade complete!');
            }
          } else {
            console.log('Run: npm install -g olivine@latest');
          }
        } else {
          console.log('You are on the latest version.');
        }
      } catch (err) {
        if (err instanceof Error && (
          err.message.includes('getaddrinfo') ||
          err.message.includes('ECONNREFUSED') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('timed out')
        )) {
          console.log('Could not reach npm registry. Check your internet connection.');
        } else {
          handleError('Upgrade failed', err);
        }
      }
    });
}
