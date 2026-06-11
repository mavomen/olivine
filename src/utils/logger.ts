type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

/** Set the minimum log level. Messages below this threshold are suppressed. */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function timestamp(): string {
  return new Date().toISOString();
}

/** Default application logger with level-based filtering. */
export const logger = {
  info(message: string): void {
    if (shouldLog('info')) {
      console.log(`[INFO] ${message}`);
    }
  },
  warn(message: string): void {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`);
    }
  },
  error(message: string): void {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`);
    }
  },
  debug(message: string): void {
    if (shouldLog('debug')) {
      console.debug(`[DEBUG] ${timestamp()} ${message}`);
    }
  },
};
