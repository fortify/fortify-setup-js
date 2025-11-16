/**
 * Fortify action runners
 * Programmatic API for running fcli actions
 */

import { execSync } from 'child_process';
import { bootstrapFcli, getCachedFcliPath } from './bootstrap.js';
import type { BootstrapOptions, BootstrapResult } from './types.js';

// Helper to get fcli version (avoid circular import)
async function getFcliVersion(fcliPath: string): Promise<string | null> {
  try {
    const { stdout } = require('child_process').execSync(`"${fcliPath}" --version`, { 
      encoding: 'utf-8',
      timeout: 5000 
    });
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? `v${match[1]}` : null;
  } catch {
    return null;
  }
}

/**
 * Options for running actions
 */
export interface RunActionOptions extends BootstrapOptions {
  /** Action arguments to pass to fcli */
  args?: string[];
  
  /** Whether to show bootstrap messages (default: false for clean output) */
  verbose?: boolean;
}

/**
 * Result from running an action
 */
export interface RunActionResult {
  /** Bootstrap result (fcli path, version, source) */
  bootstrap: BootstrapResult;
  
  /** Action exit code */
  exitCode: number;
  
  /** Action output (only available if captureOutput is true) */
  output?: string;
}

/**
 * Run fortify-setup action programmatically
 * 
 * @param options - Bootstrap and action options
 * @returns Promise with bootstrap and execution results
 * 
 * @example
 * ```typescript
 * import { runFortifySetup } from '@fortify/setup';
 * 
 * // Install ScanCentral Client
 * await runFortifySetup({
 *   args: ['--sc-client-version=latest'],
 *   verbose: true
 * });
 * 
 * // Install multiple tools
 * await runFortifySetup({
 *   args: ['--fcli-version=latest', '--sc-client-version=24.4.0'],
 *   cacheEnabled: true
 * });
 * ```
 */
export async function runFortifySetup(options: RunActionOptions = {}): Promise<RunActionResult> {
  const { args = [], verbose = false, ...bootstrapOptions } = options;
  
  // Bootstrap fcli
  if (verbose) {
    console.log('Bootstrapping fcli...\n');
  }
  
  const bootstrap = await bootstrapFcli(bootstrapOptions);
  
  if (verbose) {
    console.log(`✓ Using fcli ${bootstrap.version} (source: ${bootstrap.source})\n`);
    console.log('Running fortify-setup action...\n');
  }
  
  // Run fortify-setup action with --self and --self-type
  const selfArgs = `--self "${bootstrap.fcliPath}" --self-type ${bootstrap.selfType}`;
  const cmd = `"${bootstrap.fcliPath}" action run fortify-setup ${selfArgs} ${args.join(' ')}`;
  
  try {
    execSync(cmd, { stdio: verbose ? 'inherit' : 'pipe' });
    return {
      bootstrap,
      exitCode: 0
    };
  } catch (error: any) {
    return {
      bootstrap,
      exitCode: error.status || 1
    };
  }
}

/**
 * Run fortify-env action programmatically
 * 
 * @param options - Bootstrap and action options
 * @returns Promise with bootstrap results and environment output
 * 
 * @example
 * ```typescript
 * import { runFortifyEnv } from '@fortify/setup';
 * 
 * // Get environment variables for all installed tools
 * const result = await runFortifyEnv();
 * console.log(result.output); // Environment variable definitions
 * 
 * // Get env for specific tools with versions
 * await runFortifyEnv({
 *   args: ['--sc-client-version', '24.4.0', '--format', 'github']
 * });
 * ```
 */
export async function runFortifyEnv(options: RunActionOptions = {}): Promise<RunActionResult> {
  const { args = [], verbose = false, ...bootstrapOptions } = options;
  
  // Try to use cached fcli first (from previous run command)
  let bootstrap: BootstrapResult;
  const cachedPath = getCachedFcliPath();
  
  if (cachedPath) {
    // Use cached fcli from previous run
    const version = await getFcliVersion(cachedPath) || 'unknown';
    bootstrap = {
      fcliPath: cachedPath,
      version,
      source: 'cache',
      selfType: 'unstable'
    };
  } else {
    // Fallback to bootstrap (e.g., if pre-installed fcli available)
    bootstrap = await bootstrapFcli(bootstrapOptions);
  }
  
  // Run fortify-env action
  const cmd = `"${bootstrap.fcliPath}" action run fortify-env ${args.join(' ')}`;
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8' });
    return {
      bootstrap,
      exitCode: 0,
      output
    };
  } catch (error: any) {
    return {
      bootstrap,
      exitCode: error.status || 1,
      output: error.stdout || ''
    };
  }
}

/**
 * Get help for an fcli action
 * 
 * @param actionName - Name of the action (e.g., 'fortify-setup', 'fortify-env')
 * @param options - Bootstrap options
 * @returns Promise with help text
 * 
 * @example
 * ```typescript
 * import { getActionHelp } from '@fortify/setup';
 * 
 * const help = await getActionHelp('fortify-setup');
 * console.log(help);
 * ```
 */
export async function getActionHelp(
  actionName: string,
  options: BootstrapOptions = {}
): Promise<string> {
  const bootstrap = await bootstrapFcli(options);
  const cmd = `"${bootstrap.fcliPath}" action help ${actionName}`;
  
  try {
    return execSync(cmd, { encoding: 'utf-8' });
  } catch (error: any) {
    throw new Error(`Failed to get help for action '${actionName}': ${error.message}`);
  }
}
