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
  
  // Check if fcli is available, bootstrap if needed
  let fcliPath = getFcliPathForEnv();
  let bootstrap: BootstrapResult;
  
  if (!fcliPath) {
    // Bootstrap fcli
    if (verbose) {
      console.log('Bootstrapping fcli...\n');
    }
    
    bootstrap = await bootstrapFcli(bootstrapOptions);
    fcliPath = bootstrap.fcliPath;
    
    if (verbose) {
      console.log(`✓ Using fcli ${bootstrap.version} (source: ${bootstrap.source})\n`);
    }
  } else {
    // Use existing fcli
    const version = await getFcliVersion(fcliPath) || 'unknown';
    bootstrap = {
      fcliPath,
      version,
      source: getLastDownloadedFcliPath() ? 'cached' : 'preinstalled'
    };
    
    if (verbose) {
      console.log(`✓ Using fcli ${bootstrap.version} (source: ${bootstrap.source})\n`);
    }
  }
  
  const subcommand = args[0] || '';
  const isInit = subcommand === 'init';
  
  // For init, add --self parameter and show progress
  const cmdArgs = isInit 
    ? `-Xwrapped tool env init "--self=${fcliPath}" ${args.slice(1).join(' ')}`
    : `-Xwrapped tool env ${args.join(' ')}`;
  
  const cmd = `"${fcliPath}" ${cmdArgs}`;
  
  if (verbose && isInit) {
    console.log('Running tool env init...\n');
  }
  
  try {
    const output = execSync(cmd, { 
      stdio: (verbose && isInit) ? 'inherit' : 'pipe',
      encoding: 'utf-8' 
    });
    return {
      bootstrap,
      exitCode: 0,
      output: (verbose && isInit) ? undefined : output
    };
  } catch (error: any) {
    if (verbose) {
      showTroubleshootingMessage('fcli tool env command failed', bootstrap.source);
    }
    
    // Show command output on failure
    if (error.stderr) {
      console.error('Error output from fcli command:');
      console.error(error.stderr.toString());
    }
    if (error.stdout && !isInit) {
      console.error('Standard output from fcli command:');
      console.error(error.stdout.toString());
    }
    
    return {
      bootstrap,
      exitCode: error.status || 1,
      output: error.stdout ? error.stdout.toString() : undefined
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
 * Manage fcli cache
 * 
 * @param action - Cache action: 'refresh', 'clear', or 'info'
 */
export async function manageFcliCache(action: string): Promise<void> {
  const cachePath = getLastDownloadedFcliPath();
  
  switch (action) {
    case 'refresh':
      console.log('Refreshing cached fcli to latest version...\n');
      // Clear cache first to force re-download
      if (cachePath) {
        const cacheDir = path.dirname(path.dirname(cachePath));
        if (fs.existsSync(cacheDir)) {
          fs.rmSync(cacheDir, { recursive: true, force: true });
        }
      }
      const bootstrap = await bootstrapFcli();
      console.log(`✓ Cached fcli refreshed to ${bootstrap.version}`);
      console.log(`  Path: ${bootstrap.fcliPath}`);
      break;
      
    case 'clear':
      if (cachePath) {
        const cacheDir = path.dirname(path.dirname(cachePath));
        if (fs.existsSync(cacheDir)) {
          fs.rmSync(cacheDir, { recursive: true, force: true });
          console.log('✓ Cache cleared');
        } else {
          console.log('Cache is already empty');
        }
      } else {
        console.log('No cached fcli found');
      }
      break;
      
    case 'info':
      if (cachePath && fs.existsSync(cachePath)) {
        const version = await getFcliVersion(cachePath);
        console.log('Cached fcli information:');
        console.log(`  Version: ${version || 'unknown'}`);
        console.log(`  Path: ${cachePath}`);
        const stats = fs.statSync(cachePath);
        console.log(`  Last modified: ${stats.mtime.toISOString()}`);
      } else {
        console.log('No cached fcli found');
        console.log('\nRun a command like \'npx @fortify/setup env init\' to create cache.');
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
