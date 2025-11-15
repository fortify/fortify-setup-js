/**
 * @fortify/setup - Library API
 * Export public interfaces for programmatic use
 */

export { bootstrapFcli, refreshCache } from './bootstrap.js';
export { loadConfig, saveConfig, getDefaultConfig, clearCache, getEffectiveConfig } from './config.js';
export type {
  BootstrapConfig,
  BootstrapOptions,
  BootstrapResult,
  CacheMetadata
} from './types.js';
