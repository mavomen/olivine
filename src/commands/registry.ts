import { Command } from 'commander';
import { buildInitCommand } from './init';
import { buildScanCommand } from './scan';
import { buildReviewCommand } from './review';
import { buildStatsCommand } from './stats';
import { buildDueCommand } from './due';

export function registerCommands(program: Command): void {
  program.addCommand(buildInitCommand());
  program.addCommand(buildScanCommand());
  program.addCommand(buildReviewCommand());
  program.addCommand(buildStatsCommand());
  program.addCommand(buildDueCommand());
}
