/**
 * GitHub Action for Fortify Setup
 * 
 * This action uses the @fortify/setup TypeScript library to install
 * Fortify tools in GitHub Actions workflows.
 */

import { runFortifySetup, runFortifyEnv } from '@fortify/setup';
import * as core from '@actions/core';

/**
 * Main action entrypoint
 */
async function run(): Promise<void> {
  try {
    // Get action inputs
    const scClientVersion = core.getInput('sc-client-version');
    const fcliVersion = core.getInput('fcli-version');
    const fodUploaderVersion = core.getInput('fod-uploader-version');
    const debrickedCliVersion = core.getInput('debricked-cli-version');
    const exportPath = core.getBooleanInput('export-path');
    const useToolCache = core.getBooleanInput('use-tool-cache');

    // Build action arguments
    const args: string[] = [];
    
    if (scClientVersion) {
      args.push(`--sc-client-version=${scClientVersion}`);
    }
    
    if (fcliVersion) {
      args.push(`--fcli-version=${fcliVersion}`);
    }
    
    if (fodUploaderVersion) {
      args.push(`--fod-uploader-version=${fodUploaderVersion}`);
    }
    
    if (debrickedCliVersion) {
      args.push(`--debricked-cli-version=${debrickedCliVersion}`);
    }
    
    if (exportPath) {
      args.push('--export-path');
    }
    
    if (useToolCache) {
      args.push('--use-tool-cache');
    }

    // Run fortify-setup action
    core.info('Installing Fortify tools...');
    
    const setupResult = await runFortifySetup({
      args,
      cacheEnabled: false, // Disable fcli caching in CI
      verbose: true
    });

    if (setupResult.exitCode !== 0) {
      throw new Error(`fortify-setup action failed with exit code ${setupResult.exitCode}`);
    }

    core.info('✓ Fortify tools installed successfully');

    // Generate environment variables for GitHub Actions
    core.info('Setting up environment variables...');
    
    const envResult = await runFortifyEnv({
      args: ['--format=github']
    });

    if (envResult.exitCode !== 0) {
      core.warning('Failed to generate environment variables');
    } else {
      core.info('✓ Environment variables configured');
    }

    // Set outputs (these would be extracted from the fortify-setup output in a real implementation)
    // For this example, we'll use the bootstrap info
    core.setOutput('fcli-version', setupResult.bootstrap.version);
    
    core.info('✓ Action completed successfully');

  } catch (error: unknown) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

// Run the action
run();
