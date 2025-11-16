/**
 * Azure DevOps Task for Fortify Setup
 * 
 * This task uses the @fortify/setup TypeScript library to install
 * Fortify tools in Azure DevOps pipelines.
 */

import { runFortifySetup, runFortifyEnv } from '@fortify/setup';
import * as tl from 'azure-pipelines-task-lib/task';

/**
 * Main task entrypoint
 */
async function run(): Promise<void> {
  try {
    // Get task inputs
    const scClientVersion = tl.getInput('scClientVersion', false);
    const fcliVersion = tl.getInput('fcliVersion', false) || 'latest';
    const fodUploaderVersion = tl.getInput('fodUploaderVersion', false);
    const debrickedCliVersion = tl.getInput('debrickedCliVersion', false);
    const exportPath = tl.getBoolInput('exportPath', false);
    const useToolCache = tl.getBoolInput('useToolCache', false);

    // Build action arguments
    const args: string[] = [];
    
    if (scClientVersion) {
      args.push(`--sc-client-version=${scClientVersion}`);
      tl.debug(`Adding ScanCentral Client version: ${scClientVersion}`);
    }
    
    if (fcliVersion) {
      args.push(`--fcli-version=${fcliVersion}`);
      tl.debug(`Adding fcli version: ${fcliVersion}`);
    }
    
    if (fodUploaderVersion) {
      args.push(`--fod-uploader-version=${fodUploaderVersion}`);
      tl.debug(`Adding FoD Uploader version: ${fodUploaderVersion}`);
    }
    
    if (debrickedCliVersion) {
      args.push(`--debricked-cli-version=${debrickedCliVersion}`);
      tl.debug(`Adding Debricked CLI version: ${debrickedCliVersion}`);
    }
    
    if (exportPath) {
      args.push('--export-path');
      tl.debug('Export to PATH enabled');
    }
    
    if (useToolCache) {
      args.push('--use-tool-cache');
      tl.debug('Tool cache enabled');
    }

    // Run fortify-setup action
    console.log('Installing Fortify tools...');
    
    const setupResult = await runFortifySetup({
      args,
      cacheEnabled: false, // Disable fcli caching in CI
      verbose: true
    });

    if (setupResult.exitCode !== 0) {
      tl.setResult(
        tl.TaskResult.Failed, 
        `fortify-setup action failed with exit code ${setupResult.exitCode}`
      );
      return;
    }

    console.log('✓ Fortify tools installed successfully');

    // Generate environment variables for Azure DevOps
    console.log('Setting up environment variables...');
    
    const envResult = await runFortifyEnv({
      args: ['--format=ado']
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
