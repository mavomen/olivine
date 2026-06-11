/** Directory name for Olivine data within an Obsidian vault. */
export const OLIVINE_DIR = '.olivine';
/** SQLite database filename. */
export const DATABASE_FILENAME = 'olivine.db';
/** Configuration filename. */
export const CONFIG_FILENAME = 'config.json';
/** Obsidian hidden directory name — always skipped during vault scanning. */
export const OBSIDIAN_HIDDEN_DIR = '.obsidian';
/** Directory names that are always ignored during vault scanning. */
export const IGNORED_DIRS = new Set([OLIVINE_DIR, OBSIDIAN_HIDDEN_DIR]);
/** Default scheduling algorithm when none is configured. */
export const DEFAULT_ALGORITHM = 'leitner';
