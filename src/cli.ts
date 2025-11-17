#!/usr/bin/env node

/**
 * @fortify/setup CLI
 * Bootstrap and run fcli fortify-setup action
 */

import { execSync } from 'child_process';
import { runFortifySetup, runFortifyEnv, getActionHelp, showFortifyEnvHelp } from './actions.js';
import { loadConfig, saveConfig, getDefaultConfig } from './config.js';
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
  config        Configure fcli bootstrap settings
  run [options] Bootstrap fcli and run fortify-setup action (default)
  env [options] Generate environment variables for installed Fortify tools

Run 'npx @fortify/setup <command> --help' for more information on a command.

NOTE
  The 'run' command always re-downloads to ensure latest fcli version is used.
  The downloaded fcli is saved to an internal cache for use by the 'env' command.
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
  1. Configured path (via config file or FCLI_PATH env var). Must be 3.14.0+
  2. FCLI-specific environment variables (FCLI, FCLI_CMD, FCLI_HOME)
  3. Download latest v3.x (always re-downloads to ensure latest version is used)
  
  NOTE: Step 3 always re-downloads to ensure latest fcli version is used. The
  downloaded fcli is saved to an internal cache for use by the 'env' command.

EXAMPLES
  # Install ScanCentral Client
  npx @fortify/setup run --sc-client=latest
  
  # Install multiple tools
  npx @fortify/setup run --fcli=latest --sc-client=24.4.0
  
  # Use CI/CD tool cache
  npx @fortify/setup run --use-tool-cache --sc-client=latest
  
  # Air-gapped mode (pre-installed tools only)
  npx @fortify/setup run --air-gapped --sc-client=auto
  
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

PREREQUISITE
  The 'env' command does NOT bootstrap or download fcli. It requires one of:
  1. The 'run' command has been executed (uses cached fcli from last run)
  2. Pre-installed fcli configured via 'config --fcli-path' or env vars

  If neither is available, the command will fail with an error.

EXAMPLES
  # Generate env for all installed tools (shell format)
  npx @fortify/setup env
  
  # Generate env for specific tools with versions
  npx @fortify/setup env --sc-client 24.4.0 --fcli latest
  
  # Generate env for GitHub Actions
  npx @fortify/setup env --format github
  
  # Use in shell (bash/zsh)
  source <(npx @fortify/setup env)
  
  # Show complete fcli action help
  npx @fortify/setup env --fcli-help
`);
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
      if (arg.includes('=')) {
        config.fcliUrl = arg.split('=')[1];
      } else {
        config.fcliUrl = args[++i];
      }
    } else if (arg.startsWith('--fcli-path')) {
      if (arg.includes('=')) {
        config.fcliPath = arg.split('=')[1];
      } else {
        config.fcliPath = args[++i];
      }
    } else if (arg === '--verify-signature') {
      config.verifySignature = true;
    } else if (arg === '--no-verify-signature') {
      config.verifySignature = false;
    } else if (arg.startsWith('--fcli-rsa-sha256-url')) {
      if (arg.includes('=')) {
        config.fcliRsaSha256Url = arg.split('=')[1];
      } else {
        config.fcliRsaSha256Url = args[++i];
      }
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
    const validCommands = ['config', 'run', 'env'];
    
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
      
      const { config: updates, reset, show } = parseConfigOptions(configArgs);
      
      if (show) {
        const currentConfig = loadConfig();
        console.log('Current configuration:\n');
        if (currentConfig.fcliUrl) {
          console.log(`  fcli-url: ${currentConfig.fcliUrl}`);
        }
        if (currentConfig.fcliRsaSha256Url) {
          console.log(`  fcli-rsa-sha256-url: ${currentConfig.fcliRsaSha256Url}`);
        }
        console.log(`  verify-signature: ${currentConfig.verifySignature}`);
        if (currentConfig.fcliPath) {
          console.log(`  fcli-path: ${currentConfig.fcliPath}`);
        }
        console.log('\nNote: Environment variables (FCLI_URL, FCLI_PATH, etc.) override these settings.');
        process.exit(0);
      }
      
      if (reset) {
        const { resetConfig } = await import('./config.js');
        resetConfig();
        console.log('✓ Configuration reset to defaults');
        process.exit(0);
      }
      
      // If any configuration options were provided, start fresh with defaults
      // then apply only the specified updates. This prevents mismatches like
      // old signature URLs being used with new fcli URLs.
      const hasConfigUpdates = Object.keys(updates).length > 0;
      const newConfig = hasConfigUpdates ? { ...getDefaultConfig(), ...updates } : loadConfig();
      
      saveConfig(newConfig);
      
      console.log('✓ Configuration saved\n');
      console.log('Current settings:');
      if (newConfig.fcliUrl) {
        console.log(`  fcli-url: ${newConfig.fcliUrl}`);
      }
      if (newConfig.fcliRsaSha256Url) {
        console.log(`  fcli-rsa-sha256-url: ${newConfig.fcliRsaSha256Url}`);
      }
      console.log(`  verify-signature: ${newConfig.verifySignature}`);
      if (newConfig.fcliPath) {
        console.log(`  fcli-path: ${newConfig.fcliPath}`);
      }
      
      process.exit(0);
    }
    
    // Run fortify-setup action
    if (command === 'run') {
      const actionArgs = args.slice(1);
      
      // Show npm-specific help only (no bootstrap required, check anywhere in args)
      if (actionArgs.length === 0 || actionArgs.includes('--help') || actionArgs.includes('-h')) {
        showRunHelp();
        process.exit(0);
      }
      
      // Show fcli action help (requires bootstrap, check anywhere in args)
      if (actionArgs.includes('--fcli-help')) {
        console.log('Bootstrapping fcli to show action help...\n');
        try {
          const help = await getActionHelp('fortify-setup');
          console.log(help);
          process.exit(0);
        } catch (error: any) {
          // Check if this is a bootstrap/download error vs action execution error
          const isBootstrapError = error.message.includes('download') || error.message.includes('signature');
          
          if (isBootstrapError) {
            // Bootstrap errors already have good context, just re-throw
            throw error;
          }
          
          // Action execution error - add troubleshooting
          console.error(`\n❌ Error: Failed to get action help\n`);
          console.error('Troubleshooting suggestions:');
          console.error('  • This command requires fcli 3.14.0 or later');
          const config = loadConfig();
          if (config.fcliUrl || config.fcliPath) {
            console.error('  • Your custom fcli may be too old or incompatible');
            console.error('  • Try using the default version: fortify-setup config --reset');
          }
          console.error('');
          process.exit(1);
        }
      }
      
      // Run action
      const result = await runFortifySetup({
        args: actionArgs,
        verbose: true
      });
      
      process.exit(result.exitCode);
    }
    
    // Run fortify-env action
    if (command === 'env') {
      const actionArgs = args.slice(1);
      
      // Show npm-specific help only (no bootstrap required, check anywhere in args)
      if (actionArgs.includes('--help') || actionArgs.includes('-h')) {
        showEnvHelp();
        process.exit(0);
      }
      
      // Show fcli action help (requires fcli access, check anywhere in args)
      if (actionArgs.includes('--fcli-help')) {
        try {
          showFortifyEnvHelp();
          process.exit(0);
        } catch (error: any) {
          // If error message suggests it's not available, provide specific help
          if (error.message.includes('No fcli available')) {
            console.error(`\n❌ Error: ${error.message}\n`);
            process.exit(1);
          }
          
          // Otherwise show troubleshooting for compatibility issues
          console.error(`\n❌ Error: Failed to get action help\n`);
          console.error('Troubleshooting suggestions:');
          console.error('  • This command requires fcli 3.14.0 or later');
          const config = loadConfig();
          if (config.fcliUrl || config.fcliPath) {
            console.error('  • Your custom fcli may be too old or incompatible');
            console.error('  • Try using the default version: fortify-setup config --reset');
          } else {
            console.error('  • Run the "run" command first to download and cache fcli');
          }
          console.error('');
          process.exit(1);
        }
      }
      
      // Run action (no bootstrap, use cached or configured fcli)
      const result = await runFortifyEnv({
        args: actionArgs
      });
      
      if (result.exitCode !== 0) {
        console.error(`\n❌ Error: fortify-env action failed with exit code ${result.exitCode}\n`);
        console.error('Troubleshooting suggestions:');
        console.error('  • Verify your action options are correct (run with --fcli-help to see available options)');
        if (result.bootstrap.source === 'configured' || result.bootstrap.source === 'preinstalled') {
          console.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
          console.error('  • Try using the default version: fortify-setup config --reset');
        }
        console.error('');
      }
      
      process.exit(result.exitCode);
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
