/**
 * Simple logger utility for centralized logging
 */

export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  verbose: (message: string) => void;
}

/**
 * Create a logger with optional verbose mode
 */
export function createLogger(isVerbose: boolean = false): Logger {
  return {
    info: (message: string) => console.log(message),
    warn: (message: string) => console.warn(message),
    error: (message: string) => console.error(message),
    verbose: (message: string) => {
      if (isVerbose) {
        console.log(message);
      }
    }
  };
}

/**
 * Default logger instance (non-verbose)
 */
export const defaultLogger = createLogger(false);
