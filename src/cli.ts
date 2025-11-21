#!/usr/bin/env node

/**
 * @fortify/setup CLI
 * Bootstrap and run fcli fortify-setup action
 */

import { execSync } from 'child_process';
import { runFortifySetup, runFortifyEnv, getFcliPathForEnv } from './actions.js';
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
tool setup command to detect, register, and install Fortify tools for
use in CI/CD workflows.

USAGE
  npx @fortify/setup <command> [options]

COMMANDS
  config        Configure fcli bootstrap settings
  install       Install/setup Fortify tools
  env           Generate environment variables for installed Fortify tools

Run 'npx @fortify/setup <command> --help' for more information on a command.

NOTE
  The 'install' command always re-downloads to ensure latest fcli version is used.
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
 * Show install command help
 */
function showInstallHelp(): void {
  console.log(`
Install/setup Fortify tools

Bootstrapping downloads a predefined fcli version that's then used to run
the fcli tool setup command.

USAGE
  npx @fortify/setup install [options]

All options are passed through to the tool setup command.

OPTIONS
  --help|-h                   Show this help information
  --fcli-help                 Show fcli tool setup help

BOOTSTRAP BEHAVIOR
  Bootstrap searches for fcli in the following order:
  1. Configured path (via config file or FCLI_PATH env var). Must be 3.14.0+
  2. FCLI-specific environment variables (FCLI, FCLI_CMD, FCLI_HOME)
  3. Download latest v3.x (always re-downloads to ensure latest version is used)
  
  NOTE: Step 3 always re-downloads to ensure latest fcli version is used. The
  downloaded fcli is saved to an internal cache for use by the 'env' command.

EXAMPLES
  # Install ScanCentral Client
  npx @fortify/setup install --tools=sc-client
  
  # Install multiple tools
  npx @fortify/setup install --tools=fcli,sc-client
  
  # Use CI/CD tool cache
  npx @fortify/setup install --tools=sc-client --tool-cache-pattern=/tmp/cache/{tool}/{version}
  
  # Air-gapped mode (pre-installed tools only)
  npx @fortify/setup install --tools=sc-client --air-gapped
  
  # Show fcli tool setup help
  npx @fortify/setup install --fcli-help
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
  npx @fortify/setup env <type> [options]

The <type> parameter specifies the output format (e.g., shell, github, ado, gitlab).

OPTIONS
  --help|-h                   Show this help information
  --fcli-help                 Show fcli tool env help (fortify-setup env --fcli-help shows
                             information on available types, fortify-setup env <type> --fcli-help
                             shows help for that specific type)

PREREQUISITE
  The 'env' command does NOT bootstrap or download fcli. It requires one of:
  1. The 'install' command has been executed (uses cached fcli from last run)
  2. Pre-installed fcli configured via 'config --fcli-path' or env vars

  If neither is available, the command will fail with an error.

EXAMPLES
  # Generate env for all installed tools (shell format)
  npx @fortify/setup env shell
  
  # Generate env for specific tools with versions
  npx @fortify/setup env shell --tools=sc-client:24.4.0
  
  # Generate env for GitHub Actions
  npx @fortify/setup env github
  
  # Use in shell (bash/zsh)
  source <(npx @fortify/setup env shell)
  
  # Show fcli tool env help
  npx @fortify/setup env shell --fcli-help
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
    const validCommands = ['config', 'install', 'env'];
    
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
    
    // Install/setup Fortify tools
    if (command === 'install') {
      const actionArgs = args.slice(1);
      
      // Show npm-specific help only (no bootstrap required, check anywhere in args)
      if (actionArgs.length === 0 || actionArgs.includes('--help') || actionArgs.includes('-h')) {
        showInstallHelp();
        process.exit(0);
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
      
      // Run action (no bootstrap, use cached or configured fcli)
      const result = await runFortifyEnv({
        args: actionArgs
      });
      
      if (result.exitCode !== 0) {
        console.error(`\n❌ Error: tool env command failed with exit code ${result.exitCode}\n`);
        console.error('Troubleshooting suggestions:');
        console.error('  • Verify your type and options are correct');
        if (result.bootstrap.source === 'configured' || result.bootstrap.source === 'preinstalled') {
          console.error('  • Your custom fcli may be too old or incompatible (requires fcli 3.14.0 or later)');
          console.error('  • Try using the default version: fortify-setup config --reset');
        }
        console.error('');
      } else {
        // Print the environment variable output
        console.log(result.output);
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
