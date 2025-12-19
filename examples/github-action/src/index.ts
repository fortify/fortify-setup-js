/**
 * GitHub Action for Fortify Setup
 * 
 * This action uses the @fortify/setup TypeScript library to initialize
 * Fortify tools in GitHub Actions workflows.
 */

import { runFortifyEnv } from '@fortify/setup';
import * as core from '@actions/core';

/**
 * Main action entrypoint
 */
async function run(): Promise<void> {
  try {
    // Get action inputs - tools list with versions
    const tools = core.getInput('tools') || 'fcli:auto,sc-client:auto';
    const verbose = core.getBooleanInput('verbose') || false;

    // Initialize Fortify tools
    core.info('Initializing Fortify tools...');
    
    const initResult = await runFortifyEnv({
      args: ['init', `--tools=${tools}`],
      verbose
    });

    if (initResult.exitCode !== 0) {
      throw new Error(`Tool initialization failed with exit code ${initResult.exitCode}`);
    }

    core.info('✓ Fortify tools initialized successfully');

    // Generate environment variables for GitHub Actions
    core.info('Setting up environment variables...');
    
    const envResult = await runFortifyEnv({
      args: ['github']
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
