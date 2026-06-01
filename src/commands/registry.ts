import { Command } from 'commander';
import { buildInitCommand } from './init';
import { buildScanCommand } from './scan';
import { buildReviewCommand } from './review';
import { buildStatsCommand } from './stats';
import { buildDueCommand } from './due';
import { buildAddCommand } from './add';
import { buildConfigCommand } from './config';
import { buildEditCommand } from './edit';
import { buildBrowseCommand } from './browse';
import { buildGrepCommand } from './grep';

export function registerCommands(program: Command): void {
  program.addCommand(buildInitCommand());
  program.addCommand(buildScanCommand());
  program.addCommand(buildReviewCommand());
  program.addCommand(buildStatsCommand());
  program.addCommand(buildDueCommand());
  program.addCommand(buildAddCommand());
  program.addCommand(buildConfigCommand());
  program.addCommand(buildEditCommand());
  program.addCommand(buildBrowseCommand());
  program.addCommand(buildGrepCommand());
}
