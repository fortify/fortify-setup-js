#!/usr/bin/env node

/**
 * @fortify/setup CLI
 * Bootstrap and run fcli fortify-setup action
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runFortifyEnv, getFcliPathForEnv } from './actions.js';
import { loadConfig, saveConfig, getDefaultConfig } from './config.js';
import type { BootstrapConfig } from './types.js';
import { BootstrapSource } from './types.js';
import { createLogger, defaultLogger } from './logger.js';
import { parseCliArgument, formatError } from './utils.js';

const args = process.argv.slice(2);
const command = args[0];

/**
 * Show main help
 */
function showHelp(): void {
  console.log(`
@fortify/setup

NPM package that bootstraps fcli and provides a unified interface for
Fortify tool environment management through the 'fcli tool env' command.

USAGE
  npx @fortify/setup <command> [options]

COMMANDS
  config        Configure fcli bootstrap settings
  env           Initialize tools and generate environment variables
  cache         Manage cached fcli installation

Run 'npx @fortify/setup <command> --help' for more information on a command.

NOTE
  The 'env' command uses cached fcli if available, otherwise bootstraps fresh.
  Use 'env init' to set up tools, then 'env <format>' to generate environment vars.
`);
}

/**
 * Show config command help
 */
function showConfigHelp(): void {
  console.log(`
Configure fcli bootstrap settings

Bootstrapping downloads a predefined fcli version that's then used to run
the fcli fortify-setup action. This command configures bootstrap behavior.

USAGE
  npx @fortify/setup config [options]

OPTIONS
  --help|-h                   Show this help information
  --fcli-url=<url>              Full URL to fcli archive (platform-specific)
                                Example: https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz
  --fcli-rsa-sha256-url=<url>   Full URL to RSA SHA256 signature file
                                Default: <fcli-url>.rsa_sha256
  --fcli-path=<path>            Use pre-installed fcli binary (skip download)
                             Must be fcli 3.14.0+
  --verify-signature         Verify RSA signatures on downloads (default)
  --no-verify-signature      Skip signature verification (not recommended)
  --reset                    Reset configuration to defaults
  --show                     Display current configuration and exit

OPTION RESET BEHAVIOR
  Specifying any option on the config command resets all other mutually-exclusive
  options. For example, configuring --fcli-url clears any previously configured
  --fcli-path setting, and vice versa. This ensures only one download/path method
  is active at a time.

ENVIRONMENT VARIABLES
  FCLI_URL                   Override fcli archive download URL
  FCLI_RSA_SHA256_URL        Override RSA SHA256 signature file URL
  FCLI_PATH                  Override fcli binary path (must be 3.14.0+)
  FCLI_VERIFY_SIGNATURE      Enable/disable signature verification (true|false)

Environment variables override config file settings.

EXAMPLES
  # Use pre-installed fcli (skip downloads)
  npx @fortify/setup config --fcli-path=/usr/local/bin/fcli
  
  # Use custom download URL
  npx @fortify/setup config --fcli-url=https://my-mirror.com/fcli-linux.tgz
  
  # Disable signature verification (not recommended)
  npx @fortify/setup config --no-verify-signature
  
  # Reset to defaults
  npx @fortify/setup config --reset
  
  # Configure via environment variables
  export FCLI_PATH=/usr/local/bin/fcli
  npx @fortify/setup config
`);
}

/**
 * Show cache command help
 */
function showCacheHelp(): void {
  console.log(`
Manage cached fcli installation

The cache stores a downloaded fcli for reuse by the 'env' command.

USAGE
  npx @fortify/setup cache <action>

ACTIONS
  refresh       Refresh cached fcli to latest version
  clear         Remove cached fcli
  info          Show cached fcli information

EXAMPLES
  # Refresh to latest fcli
  npx @fortify/setup cache refresh
  
  # Clear cache
  npx @fortify/setup cache clear
  
  # Show cache info
  npx @fortify/setup cache info
`);
}

/**
 * Show env command help
 */
function showEnvHelp(): void {
  console.log(`
Initialize tools and generate environment variables

Provides a unified interface to both 'fcli tool env init' (for tool setup)
and 'fcli tool env <format>' (for generating environment variables).

USAGE
  npx @fortify/setup env <subcommand> [options]

SUBCOMMANDS
  init          Initialize/install Fortify tools (fcli tool env init)
  shell         Generate shell environment variables
  github        Generate GitHub Actions environment
  ado           Generate Azure DevOps environment
  gitlab        Generate GitLab CI environment
  powershell    Generate PowerShell environment
  expr          Evaluate custom template expressions

OPTIONS
  --help|-h                   Show this help information
  --fcli-help                 Show fcli tool env help

BOOTSTRAP BEHAVIOR
  The env command uses cached fcli if present, otherwise bootstraps automatically.
  Cached fcli is created by previous env commands or can be pre-populated.

EXAMPLES
  # Initialize tools
  npx @fortify/setup env init --tools=sc-client
  
  # Generate shell environment
  npx @fortify/setup env shell
  
  # Initialize and generate in one workflow
  npx @fortify/setup env init --tools=fcli,sc-client
  npx @fortify/setup env shell
  
  # Use in shell (bash/zsh)
  source <(npx @fortify/setup env shell)
  
  # Show fcli tool env help
  npx @fortify/setup env --fcli-help
`);
}

/**
 * Display current configuration
 */
function displayConfig(config: BootstrapConfig): void {
  console.log('Current configuration:');
  if (config.fcliPath) {
    console.log(`  fcli-path: ${config.fcliPath}`);
  } else {
    console.log(`  fcli-url:            ${config.fcliUrl}`);
    const rsaSha256Url = config.fcliRsaSha256Url || `${config.fcliUrl}.rsa_sha256`;
    console.log(`  fcli-rsa-sha256-url: ${rsaSha256Url}`);
    console.log(`  verify-signature:    ${config.verifySignature}`);
  }
}

/**
 * Parse config options
 */
function parseConfigOptions(args: string[]): { config: Partial<BootstrapConfig>, reset: boolean, show: boolean } {
  const config: Partial<BootstrapConfig> = {};
  let reset = false;
  let show = false;
  const validOptions = [
    '--fcli-url',
    '--fcli-path',
    '--verify-signature',
    '--no-verify-signature',
    '--fcli-rsa-sha256-url',
    '--reset',
    '--show'
  ];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Validate option is recognized (check both --option and --option=value formats)
    const optionName = arg.split('=')[0];
    const isValid = validOptions.includes(optionName);
    
    if (!isValid) {
      throw new Error(`Unknown option: ${arg}`);
    }
    
    // Parse --fcli-url or --fcli-url=<value>
    if (arg.startsWith('--fcli-url')) {
      const [value, newIndex] = parseCliArgument(args, i, '--fcli-url');
      config.fcliUrl = value;
      i = newIndex;
    } else if (arg.startsWith('--fcli-path')) {
      const [value, newIndex] = parseCliArgument(args, i, '--fcli-path');
      config.fcliPath = value;
      i = newIndex;
    } else if (arg === '--verify-signature') {
      config.verifySignature = true;
    } else if (arg === '--no-verify-signature') {
      config.verifySignature = false;
    } else if (arg.startsWith('--fcli-rsa-sha256-url')) {
      const [value, newIndex] = parseCliArgument(args, i, '--fcli-rsa-sha256-url');
      config.fcliRsaSha256Url = value;
      i = newIndex;
    } else if (arg === '--reset') {
      reset = true;
    } else if (arg === '--show') {
      show = true;
    }
  }
  
  return { config, reset, show };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Valid subcommands
    const validCommands = ['config', 'env', 'cache'];
    
    // Check for help at root level (no command or command is help flag)
    if (!command || command === '--help' || command === '-h' || command === 'help') {
      showHelp();
      process.exit(0);
    }
    
    // Check for help with invalid command
    if (!validCommands.includes(command) && (args.includes('--help') || args.includes('-h'))) {
      showHelp();
      process.exit(0);
    }
    
    // Configure bootstrap
    if (command === 'config') {
      const configArgs = args.slice(1);
      
      // Show config help (check for help flag anywhere in args)
      if (configArgs.includes('--help') || configArgs.includes('-h')) {
        showConfigHelp();
        process.exit(0);
      }
      
      // If no arguments provided, show help
      if (configArgs.length === 0) {
        showConfigHelp();
        process.exit(0);
      }
      
      const { config: updates, reset, show } = parseConfigOptions(configArgs);
      
      if (show) {
        const currentConfig = loadConfig();
        displayConfig(currentConfig);
        console.log('\nNote: Environment variables (FCLI_URL, FCLI_PATH, etc.) override these settings.');
        process.exit(0);
      }
      
      if (reset) {
        const { resetConfig } = await import('./config.js');
        resetConfig();
        defaultLogger.info('✓ Configuration reset to defaults\n');
        const currentConfig = loadConfig();
        displayConfig(currentConfig);
        process.exit(0);
      }
      
      // If any configuration options were provided, clear bootstrap cache to force re-download
      const hasConfigUpdates = Object.keys(updates).length > 0;
      if (hasConfigUpdates) {
        const { resetConfig: clearCache } = await import('./config.js');
        // Clear bootstrap cache but don't reset config file yet
        const bootstrapDir = path.join(os.homedir(), '.fortify', 'fcli', 'bootstrap');
        if (fs.existsSync(bootstrapDir)) {
          fs.rmSync(bootstrapDir, { recursive: true, force: true });
        }
      }
      
      // Start fresh with defaults then apply only the specified updates
      // This prevents mismatches like old signature URLs being used with new fcli URLs
      const newConfig = hasConfigUpdates ? { ...getDefaultConfig(), ...updates } : loadConfig();
      
      saveConfig(newConfig);
      
      defaultLogger.info('✓ Configuration saved\n');
      displayConfig(newConfig);
      
      process.exit(0);
    }
    
    // Manage cache
    if (command === 'cache') {
      const actionArgs = args.slice(1);
      const action = actionArgs[0];
      
      // Show help if no action or help flag
      if (!action || action === '--help' || action === '-h') {
        showCacheHelp();
        process.exit(0);
      }
      
      const { manageFcliCache } = await import('./actions.js');
      await manageFcliCache(action);
      process.exit(0);
    }
    
    // Run env command (handles both init and format subcommands)
    if (command === 'env') {
      const actionArgs = args.slice(1);
      
      // Show help if no args or help flag
      if (actionArgs.length === 0 || actionArgs.includes('--help') || actionArgs.includes('-h')) {
        showEnvHelp();
        process.exit(0);
      }
      
      // Run action (bootstraps if needed)
      const result = await runFortifyEnv({
        args: actionArgs,
        verbose: actionArgs[0] === 'init'
      });
      
      if (result.exitCode !== 0) {
        defaultLogger.error(`\n❌ Error: fcli tool env command failed with exit code ${result.exitCode}\n`);
        defaultLogger.error('Troubleshooting suggestions:');
        defaultLogger.error('  • Verify your subcommand and options are correct');
        if (result.bootstrap.source === BootstrapSource.CONFIGURED || result.bootstrap.source === BootstrapSource.PREINSTALLED) {
          defaultLogger.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
          defaultLogger.error('  • Try using the default version: npx @fortify/setup config --reset');
        }
        defaultLogger.error('');
      } else if (result.output) {
        // Print the output (for format subcommands, not for init)
        defaultLogger.info(result.output);
      }
      
      process.exit(result.exitCode);
    }
    
    // Unknown command
    defaultLogger.error(`Unknown command: ${command}`);
    defaultLogger.error('Run "npx @fortify/setup --help" for usage information');
    process.exit(1);
    
  } catch (error) {
    defaultLogger.error(`\n❌ Error: ${formatError(error)}\n`);
    process.exit(1);
  }
}

main();
