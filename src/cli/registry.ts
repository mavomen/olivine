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
import { buildArchiveCommand } from './archive';
import { buildUnarchiveCommand } from './unarchive';
import { buildPracticeCommand } from './practice';
import { buildMigrateCommand } from './migrate';
import { buildExportCommand } from './export';
import { buildImportCommand } from './import';
import { buildTuiCommand } from './tui';

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
  program.addCommand(buildArchiveCommand());
  program.addCommand(buildUnarchiveCommand());
  program.addCommand(buildPracticeCommand());
  program.addCommand(buildMigrateCommand());
  program.addCommand(buildExportCommand());
  program.addCommand(buildImportCommand());
  program.addCommand(buildTuiCommand());
}
