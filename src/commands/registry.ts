import { Command } from 'commander';
import { buildInitCommand } from './init';
import { buildScanCommand } from './scan';

export function registerCommands(program: Command): void {
  program.addCommand(buildInitCommand());
  program.addCommand(buildScanCommand());
}
