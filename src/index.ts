/**
 * @fortify/setup - Library API
 * Export public interfaces for programmatic use
 */

export { bootstrapFcli, getLastDownloadedFcliPath } from './bootstrap.js';
export { loadConfig, saveConfig, getDefaultConfig, getEffectiveConfig } from './config.js';
export { runFortifySetup, runFortifyEnv } from './actions.js';
export type {
  BootstrapConfig,
  BootstrapOptions,
  BootstrapResult,
  DownloadMetadata
} from './types.js';
export type { RunActionOptions, RunActionResult } from './actions.js';
