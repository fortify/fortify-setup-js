/**
 * Utility functions for validation
 */

/**
 * Validate that a string is a valid URL
 * @throws Error if URL is invalid
 */
export function validateUrl(urlString: string, paramName: string = 'URL'): void {
  try {
    new URL(urlString);
  } catch {
    throw new Error(`Invalid ${paramName}: ${urlString}`);
  }
}

/**
 * Parse CLI argument that may be in format --option=value or --option value
 * @param args Full argument array
 * @param currentIndex Current index in args array
 * @param optionName Name of the option (for error messages)
 * @returns Tuple of [value, newIndex]
 * @throws Error if value is missing
 */
export function parseCliArgument(
  args: string[],
  currentIndex: number,
  optionName: string
): [string, number] {
  const arg = args[currentIndex];
  
  if (arg.includes('=')) {
    const value = arg.substring(arg.indexOf('=') + 1);
    if (!value) {
      throw new Error(`${optionName} requires a value`);
    }
    return [value, currentIndex];
  } else {
    if (currentIndex + 1 >= args.length) {
      throw new Error(`${optionName} requires a value`);
    }
    return [args[currentIndex + 1], currentIndex + 1];
  }
}

/**
 * Format error message from unknown error type
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
