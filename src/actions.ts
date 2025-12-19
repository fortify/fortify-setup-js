/**
 * Fortify action runners
 * Programmatic API for running fcli actions
 */

import { execSync } from 'child_process';
import { bootstrapFcli, getLastDownloadedFcliPath, getFcliVersion, getFcliPathFromEnv } from './bootstrap.js';
import { getEffectiveConfig } from './config.js';
import type { BootstrapOptions, BootstrapResult } from './types.js';
import { BootstrapSource } from './types.js';
import { createLogger } from './logger.js';
import { formatError } from './utils.js';
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
 * Run fcli tool env command programmatically
 * 
 * Handles both 'init' subcommand (for tool setup) and format subcommands
 * (shell, github, etc.) for generating environment variables.
 * 
 * Automatically bootstraps fcli if not available in cache or via config.
 * 
 * @param options - Bootstrap and action options
 * @returns Promise with bootstrap and execution results
 * 
 * @example
 * ```typescript
 * import { runFortifyEnv } from '@fortify/setup';
 * 
 * // Initialize tools
 * await runFortifyEnv({
 *   args: ['init', '--tools=sc-client'],
 *   verbose: true
 * });
 * 
 * // Generate environment variables
 * await runFortifyEnv({
 *   args: ['shell']
 * });
 * ```
 */
export async function runFortifyEnv(options: RunActionOptions = {}): Promise<RunActionResult> {
  const { args = [], verbose = false, ...bootstrapOptions } = options;
  const logger = createLogger(verbose);
  
  // Check if fcli is available, bootstrap if needed
  let fcliPath = getFcliPathForEnv();
  let bootstrap: BootstrapResult;
  
  if (!fcliPath) {
    // Bootstrap fcli
    logger.verbose('Bootstrapping fcli...\n');
    
    bootstrap = await bootstrapFcli(bootstrapOptions);
    fcliPath = bootstrap.fcliPath;
    
    logger.verbose(`✓ Using fcli ${bootstrap.version} (source: ${bootstrap.source}, location: ${fcliPath})\n`);
  } else {
    // Use existing fcli
    const version = await getFcliVersion(fcliPath) || 'unknown';
    const source = getLastDownloadedFcliPath() ? BootstrapSource.CACHED : BootstrapSource.PREINSTALLED;
    bootstrap = {
      fcliPath,
      version,
      source
    };
    
    logger.verbose(`✓ Using fcli ${bootstrap.version} (source: ${source}, location: ${fcliPath})\n`);
  }
  
  const subcommand = args[0] || '';
  const isInit = subcommand === 'init';
  
  // For init, add --self parameter and show progress
  const cmdArgs = isInit 
    ? `-Xwrapped tool env init "--self=${fcliPath}" ${args.slice(1).join(' ')}`
    : `-Xwrapped tool env ${args.join(' ')}`;
  
  const cmd = `"${fcliPath}" ${cmdArgs}`;
  
  logger.verbose(isInit ? 'Running tool env init...\n' : '');
  
  try {
    const output = execSync(cmd, { 
      stdio: (verbose && isInit) ? 'inherit' : 'pipe',
      encoding: 'utf-8',
      timeout: 300000 // 5 minutes
    });
    return {
      bootstrap,
      exitCode: 0,
      output: (verbose && isInit) ? undefined : output
    };
  } catch (error) {
    if (verbose) {
      showTroubleshootingMessage('fcli tool env command failed', bootstrap.source, logger);
    }
    
    // Show command output on failure
    const err = error as { stderr?: Buffer; stdout?: Buffer; status?: number };
    if (err.stderr) {
      logger.error('Error output from fcli command:');
      logger.error(err.stderr.toString());
    }
    if (err.stdout && !isInit) {
      logger.error('Standard output from fcli command:');
      logger.error(err.stdout.toString());
    }
    
    return {
      bootstrap,
      exitCode: err.status || 1,
      output: err.stdout ? err.stdout.toString() : undefined
    };
  }
}

/**
 * Display troubleshooting message for fcli command failures
 */
function showTroubleshootingMessage(context: string, source: BootstrapSource, logger: ReturnType<typeof createLogger>): void {
  logger.error(`\n❌ ${context}\n`);
  logger.error('Troubleshooting suggestions:');
  logger.error('  • Verify your options are correct');
  if (source === BootstrapSource.CONFIGURED || source === BootstrapSource.PREINSTALLED) {
    logger.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
    logger.error('  • Try using the default version: fortify-setup config --reset');
  }
  logger.error('');
}

/**
 * Manage fcli cache
 * 
 * @param action - Cache action: 'refresh', 'clear', or 'info'
 */
export async function manageFcliCache(action: string, logger = createLogger(false)): Promise<void> {
  const cachePath = getLastDownloadedFcliPath();
  
  switch (action) {
    case 'refresh':
      logger.info('Refreshing cached fcli to latest version...\n');
      // Clear cache first to force re-download
      if (cachePath) {
        const cacheDir = path.dirname(path.dirname(cachePath));
        if (fs.existsSync(cacheDir)) {
          fs.rmSync(cacheDir, { recursive: true, force: true });
        }
      }
      const bootstrap = await bootstrapFcli();
      logger.info(`✓ Cached fcli refreshed to ${bootstrap.version}`);
      logger.info(`  Path: ${bootstrap.fcliPath}`);
      break;
      
    case 'clear':
      if (cachePath) {
        const cacheDir = path.dirname(path.dirname(cachePath));
        if (fs.existsSync(cacheDir)) {
          fs.rmSync(cacheDir, { recursive: true, force: true });
          logger.info('✓ Cache cleared');
        } else {
          logger.info('Cache is already empty');
        }
      } else {
        logger.info('No cached fcli found');
      }
      break;
      
    case 'info':
      if (cachePath && fs.existsSync(cachePath)) {
        const version = await getFcliVersion(cachePath);
        logger.info('Cached fcli information:');
        logger.info(`  Version: ${version || 'unknown'}`);
        logger.info(`  Path: ${cachePath}`);
        const stats = fs.statSync(cachePath);
        logger.info(`  Last modified: ${stats.mtime.toISOString()}`);
      } else {
        logger.info('No cached fcli found');
        logger.info('\nRun a command like \'npx @fortify/setup env init\' to create cache.');
      }
      break;
      
    default:
      throw new Error(`Unknown cache action: ${action}. Valid actions: refresh, clear, info`);
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
