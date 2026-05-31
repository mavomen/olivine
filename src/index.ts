#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommands } from './commands/registry';

const program = new Command();

program
  .name('olivine')
  .description('A local-first CLI spaced repetition tool for Obsidian vaults')
  .version('0.0.0');

registerCommands(program);

program.parse(process.argv);
