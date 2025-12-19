/**
 * Azure DevOps Task for Fortify Setup
 * 
 * This task uses the @fortify/setup TypeScript library to initialize
 * Fortify tools in Azure DevOps pipelines.
 */

import { runFortifyEnv } from '@fortify/setup';
import * as tl from 'azure-pipelines-task-lib/task';

/**
 * Main task entrypoint
 */
async function run(): Promise<void> {
  try {
    // Get task inputs - tools list with versions
    const tools = tl.getInput('tools', false) || 'fcli:auto,sc-client:auto';
    const verbose = tl.getBoolInput('verbose', false);

    tl.debug(`Tools to initialize: ${tools}`);

    // Initialize Fortify tools
    console.log('Initializing Fortify tools...');
    
    const initResult = await runFortifyEnv({
      args: ['init', `--tools=${tools}`],
      verbose
    });

    if (initResult.exitCode !== 0) {
      tl.setResult(
        tl.TaskResult.Failed, 
        `Tool initialization failed with exit code ${initResult.exitCode}`
      );
      return;
    }

    console.log('✓ Fortify tools initialized successfully');

    // Generate environment variables for Azure DevOps
    console.log('Setting up environment variables...');
    
    const envResult = await runFortifyEnv({
      args: ['ado']
    });

    if (envResult.exitCode !== 0) {
      tl.warning('Failed to generate environment variables');
    } else {
      console.log('✓ Environment variables configured');
    }

    // Set pipeline variables for downstream tasks
    tl.setVariable('FCLI_VERSION', setupResult.bootstrap.version);
    tl.setVariable('FCLI_PATH', setupResult.bootstrap.fcliPath);
    tl.setVariable('FCLI_SOURCE', setupResult.bootstrap.source);

    console.log('✓ Task completed successfully');
    tl.setResult(tl.TaskResult.Succeeded, 'Fortify tools installed successfully');

  } catch (error: unknown) {
    if (error instanceof Error) {
      tl.setResult(tl.TaskResult.Failed, `Error: ${error.message}`);
    } else {
      tl.setResult(tl.TaskResult.Failed, 'An unknown error occurred');
    }
  }
}

// Run the task
run();
