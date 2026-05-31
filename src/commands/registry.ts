import { Command } from 'commander';
import { buildInitCommand } from './init';

export function registerCommands(program: Command): void {
  program.addCommand(buildInitCommand());
}
