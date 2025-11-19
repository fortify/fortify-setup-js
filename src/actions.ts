/**
 * Fortify action runners
 * Programmatic API for running fcli actions
 */

import { execSync } from 'child_process';
import { bootstrapFcli, getLastDownloadedFcliPath } from './bootstrap.js';
import { getEffectiveConfig } from './config.js';
import type { BootstrapOptions, BootstrapResult } from './types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
 *   args: ['--sc-client=latest'],
 *   verbose: true
 * });
 * 
 * // Install multiple tools
 * await runFortifySetup({
 *   args: ['--fcli=latest', '--sc-client=24.4.0']
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
  const selfArgs = `"--self=${bootstrap.fcliPath}"`;
  const cmd = `"${bootstrap.fcliPath}" action run fortify-setup ${selfArgs} ${args.join(' ')}`;
  
  try {
    execSync(cmd, { stdio: verbose ? 'inherit' : 'pipe' });
    return {
      bootstrap,
      exitCode: 0
    };
  } catch (error: any) {
    if (verbose) {
      console.error('\n❌ fortify-setup action failed\n');
      console.error('Troubleshooting suggestions:');
      console.error('  • Verify your action options are correct (run with --fcli-help to see available options)');
      if (bootstrap.source === 'configured' || bootstrap.source === 'preinstalled') {
        console.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
        console.error('  • Try using the default version: fortify-setup config --reset');
      }
      console.error('');
    }
    return {
      bootstrap,
      exitCode: error.status || 1
    };
  }
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
 * await runFortifySetup({ args: ['--sc-client=latest'] });
 * 
 * // Then get environment variables
 * const result = await runFortifyEnv();
 * console.log(result.output); // Environment variable definitions
 * 
 * // Get env for specific tools with versions
 * await runFortifyEnv({
 *   args: ['--sc-client', '24.4.0', '--format', 'github']
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
    source: getLastDownloadedFcliPath() ? 'download' : 'preinstalled',
    selfType: getLastDownloadedFcliPath() ? 'unstable' : 'stable'
  };
  
  // Run fortify-env action
  const cmd = `"${fcliPath}" action run fortify-env ${args.join(' ')}`;
  
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
    // Enrich error with context about source
    let errorMsg = `Failed to get help for action '${actionName}': ${error.message}`;
    if (bootstrap.source === 'configured' || bootstrap.source === 'preinstalled') {
      errorMsg += ` (using ${bootstrap.source} fcli at ${bootstrap.fcliPath})`;
    }
    throw new Error(errorMsg);
  }
}

/**
 * Get fcli path without bootstrapping (for env command)
 * Checks cached fcli, then configured/pre-installed fcli
 * 
 * @returns fcli path or null if not available
 */
export function getFcliPathForEnv(): string | null {
  // Try cached fcli first
  let fcliPath = getLastDownloadedFcliPath();
  
  if (!fcliPath) {
    // Try configured path
    const config = getEffectiveConfig();
    if (config.fcliPath) {
      fcliPath = config.fcliPath;
    }
  }
  
  if (!fcliPath) {
    // Check FCLI-specific environment variables
    const fcliEnv = process.env.FCLI || process.env.FCLI_CMD || process.env.FCLI_HOME;
    if (fcliEnv) {
      const binaryName = os.platform() === 'win32' ? 'fcli.exe' : 'fcli';
      const potentialPath = fs.existsSync(fcliEnv) && fs.statSync(fcliEnv).isDirectory()
        ? path.join(fcliEnv, 'bin', binaryName)
        : fcliEnv;
        
      if (fs.existsSync(potentialPath)) {
        fcliPath = potentialPath;
      }
    }
  }
  
  return fcliPath;
}

/**
 * Show help for fortify-env action (without bootstrapping)
 * Uses cached or pre-installed fcli
 * 
 * @throws Error if no fcli is available
 */
export function showFortifyEnvHelp(): void {
  const fcliPath = getFcliPathForEnv();
  
  if (!fcliPath) {
    throw new Error('No fcli available. Run the \'run\' command first or configure a pre-installed fcli path.');
  }
  
  execSync(`"${fcliPath}" action help fortify-env`, { stdio: 'inherit' });
}
