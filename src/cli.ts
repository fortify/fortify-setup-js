#!/usr/bin/env node

/**
 * @fortify/setup CLI
 * Bootstrap and run fcli fortify-setup action
 */

import { execSync } from 'child_process';
import { bootstrapFcli, refreshCache } from './bootstrap.js';
import { loadConfig, saveConfig, getDefaultConfig, clearCache } from './config.js';
import type { BootstrapConfig } from './types.js';

const args = process.argv.slice(2);
const command = args[0];

/**
 * Show main help
 */
function showHelp(): void {
  console.log(`
@fortify/setup

NPM package that bootstraps a predefined fcli version and runs the fcli
fortify-setup action to detect, register, and install Fortify tools for
use in CI/CD workflows.

USAGE
  npx @fortify/setup <command> [options]

COMMANDS
  configure     Configure fcli bootstrap settings
  clear-cache   Clear cached fcli binary
  run [options] Bootstrap fcli and run fortify-setup action (default)
  env [options] Generate environment variables for installed Fortify tools

Run 'npx @fortify/setup <command> --help' for more information on a command.
`);
}

/**
 * Show configure command help
 */
function showConfigureHelp(): void {
  console.log(`
Configure fcli bootstrap settings

Bootstrapping downloads a predefined fcli version that's then used to run
the fcli fortify-setup action. This command configures bootstrap behavior.

USAGE
  npx @fortify/setup configure [options]

OPTIONS
  --fcli-base-url=<url>      Custom fcli download URL
                             Default: https://github.com/fortify/fcli/releases/download
  --fcli-path=<path>         Use pre-installed fcli binary (skip download)
  --cache-enabled            Enable fcli binary caching
  --no-cache-enabled         Disable fcli binary caching
  --cache-dir=<path>         Custom cache directory path
  --verify-signature         Verify RSA signatures on downloads (default)
  --no-verify-signature      Skip signature verification (not recommended)

ENVIRONMENT VARIABLES
  FCLI_BASE_URL              Override download URL
  FCLI_PATH                  Override fcli binary path
  FCLI_CACHE_ENABLED         Enable/disable caching (true|false)
  FCLI_CACHE_DIR             Override cache directory
  FCLI_VERIFY_SIGNATURE      Enable/disable signature verification (true|false)

Environment variables override config file settings.

EXAMPLES
  # Enable caching for faster subsequent runs
  npx @fortify/setup configure --cache-enabled
  
  # Use pre-installed fcli (skip downloads)
  npx @fortify/setup configure --fcli-path=/usr/local/bin/fcli
  
  # Configure via environment variables
  export FCLI_CACHE_ENABLED=true
  npx @fortify/setup configure
`);
}

/**
 * Show run command help
 */
function showRunHelp(): void {
  console.log(`
Bootstrap fcli and run fortify-setup action

Bootstrapping downloads a predefined fcli version that's then used to run
the fcli fortify-setup action.

USAGE
  npx @fortify/setup run [options]
  npx @fortify/setup run --fcli-help    Show fcli action help (requires bootstrap)

All options are passed through to the fortify-setup action.

BOOTSTRAP BEHAVIOR
  Bootstrap searches for fcli in the following order:
  1. Configured path (--fcli-path or FCLI_PATH)
  2. Environment variables (FCLI, FCLI_CMD, FCLI_HOME)
  3. PATH (existing fcli command)
  4. CI/CD tool cache (GitHub Actions, Azure Pipelines, GitLab)
  5. Download fixed fcli version (with caching)

EXAMPLES
  # Install ScanCentral Client
  npx @fortify/setup run --sc-client-version=latest
  
  # Install multiple tools
  npx @fortify/setup run --fcli-version=latest --sc-client-version=24.4.0
  
  # Use CI/CD tool cache
  npx @fortify/setup run --use-tool-cache --sc-client-version=latest
  
  # Air-gapped mode (pre-installed tools only)
  npx @fortify/setup run --air-gapped --sc-client-version=auto
  
  # Show complete fcli action help
  npx @fortify/setup run --fcli-help
`);
}

/**
 * Show env command help
 */
function showEnvHelp(): void {
  console.log(`
Generate environment variables for installed Fortify tools

Outputs environment variable definitions for installed Fortify tools in various
formats suitable for sourcing in shells or setting through CI/CD systems.

USAGE
  npx @fortify/setup env [options]
  npx @fortify/setup env --fcli-help    Show fcli action help (requires bootstrap)

All options are passed through to the fortify-env action.

BOOTSTRAP BEHAVIOR
  Bootstrap searches for fcli in the following order:
  1. Configured path (--fcli-path or FCLI_PATH)
  2. Environment variables (FCLI, FCLI_CMD, FCLI_HOME)
  3. PATH (existing fcli command)
  4. CI/CD tool cache (GitHub Actions, Azure Pipelines, GitLab)
  5. Download fixed fcli version (with caching)

EXAMPLES
  # Generate env for all installed tools (shell format)
  npx @fortify/setup env
  
  # Generate env for specific tools with versions
  npx @fortify/setup env --sc-client-version 24.4.0 --fcli-version latest
  
  # Generate env for GitHub Actions
  npx @fortify/setup env --format github
  
  # Use in shell (bash/zsh)
  source <(npx @fortify/setup env)
  
  # Show complete fcli action help
  npx @fortify/setup env --fcli-help
`);
}

/**
 * Parse configure options
 */
function parseConfigureOptions(args: string[]): Partial<BootstrapConfig> {
  const config: Partial<BootstrapConfig> = {};
  
  for (const arg of args) {
    if (arg.startsWith('--fcli-base-url=')) {
      config.baseUrl = arg.split('=')[1];
    } else if (arg.startsWith('--fcli-path=')) {
      config.fcliPath = arg.split('=')[1];
    } else if (arg.startsWith('--cache-dir=')) {
      config.cacheDir = arg.split('=')[1];
    } else if (arg === '--cache-enabled') {
      config.cacheEnabled = true;
    } else if (arg === '--no-cache-enabled') {
      config.cacheEnabled = false;
    } else if (arg === '--verify-signature') {
      config.verifySignature = true;
    } else if (arg === '--no-verify-signature') {
      config.verifySignature = false;
    } else if (arg.startsWith('--signature-url=')) {
      config.signatureUrl = arg.split('=')[1];
    }
  }
  
  return config;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Show help
    if (!command || command === '--help' || command === '-h' || command === 'help') {
      showHelp();
      process.exit(0);
    }
    
    // Configure bootstrap
    if (command === 'configure') {
      const configArgs = args.slice(1);
      
      // Show configure help
      if (configArgs[0] === '--help' || configArgs[0] === '-h') {
        showConfigureHelp();
        process.exit(0);
      }
      
      const currentConfig = loadConfig();
      const updates = parseConfigureOptions(configArgs);
      const newConfig = { ...currentConfig, ...updates };
      
      saveConfig(newConfig);
      
      console.log('✓ Configuration saved\n');
      console.log('Current settings:');
      console.log(`  base-url: ${newConfig.baseUrl}`);
      console.log(`  cache-enabled: ${newConfig.cacheEnabled}`);
      console.log(`  verify-signature: ${newConfig.verifySignature}`);
      if (newConfig.fcliPath) {
        console.log(`  fcli-path: ${newConfig.fcliPath}`);
      }
      if (newConfig.cacheDir) {
        console.log(`  cache-dir: ${newConfig.cacheDir}`);
      }
      
      process.exit(0);
    }
    
    // Clear cache
    if (command === 'clear-cache') {
      clearCache();
      process.exit(0);
    }
    
    // Run fortify-setup action
    if (command === 'run') {
      const actionArgs = args.slice(1);
      
      // Show npm-specific help only (no bootstrap required)
      if (actionArgs.length === 0 || actionArgs[0] === '--help' || actionArgs[0] === '-h') {
        showRunHelp();
        process.exit(0);
      }
      
      // Show fcli action help (requires bootstrap)
      if (actionArgs[0] === '--fcli-help') {
        console.log('Bootstrapping fcli to show action help...\n');
        const result = await bootstrapFcli();
        console.log(`✓ Using fcli ${result.version} (source: ${result.source})\n`);
        execSync(`"${result.fcliPath}" action help fortify-setup`, { stdio: 'inherit' });
        process.exit(0);
      }
      
      // Run action
      console.log('Bootstrapping fcli...\n');
      const result = await bootstrapFcli();
      console.log(`✓ Using fcli ${result.version} (source: ${result.source})\n`);
      console.log('Running fortify-setup action...\n');
      
      const cmd = `"${result.fcliPath}" action run fortify-setup ${actionArgs.join(' ')}`;
      execSync(cmd, { stdio: 'inherit' });
      
      process.exit(0);
    }
    
    // Run fortify-env action
    if (command === 'env') {
      const actionArgs = args.slice(1);
      
      // Show npm-specific help only (no bootstrap required)
      if (actionArgs.length > 0 && (actionArgs[0] === '--help' || actionArgs[0] === '-h')) {
        showEnvHelp();
        process.exit(0);
      }
      
      // Show fcli action help (requires bootstrap)
      if (actionArgs.length > 0 && actionArgs[0] === '--fcli-help') {
        console.log('Bootstrapping fcli to show action help...\n');
        const result = await bootstrapFcli();
        console.log(`✓ Using fcli ${result.version} (source: ${result.source})\n`);
        execSync(`"${result.fcliPath}" action help fortify-env`, { stdio: 'inherit' });
        process.exit(0);
      }
      
      // Run action (no bootstrap messages for clean env output)
      const result = await bootstrapFcli();
      
      const cmd = `"${result.fcliPath}" action run fortify-env ${actionArgs.join(' ')}`;
      execSync(cmd, { stdio: 'inherit' });
      
      process.exit(0);
    }
    
    // Unknown command
    console.error(`Unknown command: ${command}`);
    console.error('Run "npx @fortify/setup --help" for usage information');
    process.exit(1);
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
