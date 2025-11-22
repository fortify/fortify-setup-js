/**
 * Fortify action runners
 * Programmatic API for running fcli actions
 */

import { execSync } from 'child_process';
import { bootstrapFcli, getLastDownloadedFcliPath, getFcliVersion, getFcliPathFromEnv } from './bootstrap.js';
import { getEffectiveConfig } from './config.js';
import type { BootstrapOptions, BootstrapResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
 * This always re-downloads the latest fcli v3.x to ensure fresh binaries.
 * The downloaded fcli is saved to a temporary directory for use by runFortifyEnv().
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
 *   args: ['--tools=sc-client'],
 *   verbose: true
 * });
 * 
 * // Install multiple tools
 * await runFortifySetup({
 *   args: ['--tools=fcli,sc-client']
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
    console.log('Running tool setup...\n');
  }
  
  // Run fcli tool setup command
  const cmd = `"${bootstrap.fcliPath}" tool setup "--self=${bootstrap.fcliPath}" ${args.join(' ')}`;
  
  try {
    execSync(cmd, { stdio: verbose ? 'inherit' : 'pipe' });
    return {
      bootstrap,
      exitCode: 0
    };
  } catch (error: any) {
    if (verbose) {
      showTroubleshootingMessage('Tool setup failed', bootstrap.source);
    }
    
    // Show command output on failure
    if (error.stderr) {
      console.error('Error output from fcli command:');
      console.error(error.stderr);
    }
    if (error.stdout) {
      console.error('Standard output from fcli command:');
      console.error(error.stdout);
    }
    
    return {
      bootstrap,
      exitCode: error.status || 1
    };
  }
}

/**
 * Display troubleshooting message for fcli command failures
 */
function showTroubleshootingMessage(context: string, source: string): void {
  console.error(`\n❌ ${context}\n`);
  console.error('Troubleshooting suggestions:');
  console.error('  • Verify your options are correct');
  if (source === 'configured' || source === 'preinstalled') {
    console.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
    console.error('  • Try using the default version: fortify-setup config --reset');
  }
  console.error('');
}

/**
 * Run fortify-env action programmatically
 * 
 * This uses the fcli from the temporary directory that was downloaded during the
 * last runFortifySetup() call. If no downloaded fcli is available, it falls back
 * to bootstrap (e.g., if pre-installed fcli is available).
 * 
 * @param options - Bootstrap and action options
 * @returns Promise with bootstrap results and environment output
 * 
 * @example
 * ```typescript
 * import { runFortifySetup, runFortifyEnv } from '@fortify/setup';
 * 
 * // First run setup to download fcli
 * await runFortifySetup({ args: ['--tools=sc-client'] });
 * 
 * // Then get environment variables
 * const result = await runFortifyEnv({
 *   args: ['shell']
 * });
 * console.log(result.output); // Environment variable definitions
 * 
 * // Get env for specific tools with versions
 * await runFortifyEnv({
 *   args: ['github', '--tools=sc-client:24.4.0']
 * });
 * ```
 */
export async function runFortifyEnv(options: RunActionOptions = {}): Promise<RunActionResult> {
  const { args = [], verbose = false } = options;
  
  // Get fcli path without bootstrapping (uses cached or pre-installed)
  const fcliPath = getFcliPathForEnv();
  
  if (!fcliPath) {
    throw new Error('No fcli available. Run the \'run\' command first or configure a pre-installed fcli path.');
  }
  
  // Get version for bootstrap result
  const version = await getFcliVersion(fcliPath) || 'unknown';
  const bootstrap: BootstrapResult = {
    fcliPath,
    version,
    source: getLastDownloadedFcliPath() ? 'download' : 'preinstalled'
  };
  
  // Run fcli tool env command
  const cmd = `"${fcliPath}" tool env ${args.join(' ')}`;
  
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
 * Get fcli path without bootstrapping (for env command)
 * Checks configured/pre-installed fcli first, then cached fcli
 * 
 * @returns fcli path or null if not available
 */
export function getFcliPathForEnv(): string | null {
  // Try configured path first
  const config = getEffectiveConfig();
  if (config.fcliPath) {
    return config.fcliPath;
  }
  
  // Check FCLI-specific environment variables
  const envPath = getFcliPathFromEnv();
  if (envPath) {
    return envPath;
  }
  
  // Try cached fcli last
  return getLastDownloadedFcliPath();
}
