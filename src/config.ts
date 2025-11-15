/**
 * Configuration management for @fortify/setup
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import type { BootstrapConfig, BootstrapOptions } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'fortify', 'setup');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Fixed fcli version that contains the fortify-setup action
// Only needs to be updated when fcli fortify-setup action is enhanced
const FCLI_VERSION = 'v3.14.0';

/**
 * Get fixed fcli version
 */
export function getFcliVersion(): string {
  return FCLI_VERSION;
}

/**
 * Get default bootstrap configuration
 */
export function getDefaultConfig(): BootstrapConfig {
  return {
    baseUrl: 'https://github.com/fortify/fcli/releases/download',
    cacheEnabled: true, // Always cache the fixed version
    verifySignature: true
  };
}

/**
 * Load configuration from file (with defaults)
 */
export function loadConfig(): BootstrapConfig {
  const defaults = getDefaultConfig();
  
  if (!fs.existsSync(CONFIG_FILE)) {
    return defaults;
  }
  
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const saved = JSON.parse(content);
    return { ...defaults, ...saved };
  } catch (error: any) {
    console.warn(`Warning: Failed to load config from ${CONFIG_FILE}: ${error.message}`);
    return defaults;
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: BootstrapConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get effective configuration (config file + env overrides + runtime options)
 */
export function getEffectiveConfig(options: BootstrapOptions = {}): BootstrapConfig {
  const fileConfig = loadConfig();
  
  // Environment variable overrides
  const envOverrides: Partial<BootstrapConfig> = {};
  
  if (process.env.FCLI_BASE_URL) {
    envOverrides.baseUrl = process.env.FCLI_BASE_URL;
  }
  
  if (process.env.FCLI_CACHE_ENABLED !== undefined) {
    envOverrides.cacheEnabled = process.env.FCLI_CACHE_ENABLED === 'true';
  }
  
  if (process.env.FCLI_CACHE_DIR) {
    envOverrides.cacheDir = process.env.FCLI_CACHE_DIR;
  }
  
  if (process.env.FCLI_VERIFY_SIGNATURE !== undefined) {
    envOverrides.verifySignature = process.env.FCLI_VERIFY_SIGNATURE === 'true';
  }
  
  if (process.env.FCLI_SIGNATURE_URL) {
    envOverrides.signatureUrl = process.env.FCLI_SIGNATURE_URL;
  }
  
  if (process.env.FCLI_PATH) {
    envOverrides.fcliPath = process.env.FCLI_PATH;
  }
  
  // Runtime options take highest precedence
  return {
    ...fileConfig,
    ...envOverrides,
    ...(options.baseUrl && { baseUrl: options.baseUrl }),
    ...(options.cacheEnabled !== undefined && { cacheEnabled: options.cacheEnabled }),
    ...(options.cacheDir && { cacheDir: options.cacheDir }),
    ...(options.verifySignature !== undefined && { verifySignature: options.verifySignature }),
    ...(options.fcliPath && { fcliPath: options.fcliPath })
  };
}

/**
 * Generate configuration hash (to detect config changes)
 */
export function getConfigHash(config: BootstrapConfig): string {
  const relevant = {
    fcliVersion: FCLI_VERSION,
    baseUrl: config.baseUrl,
    verifySignature: config.verifySignature
  };
  return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 16);
}

/**
 * Get cache directory
 */
export function getCacheDir(config: BootstrapConfig): string {
  if (config.cacheDir) {
    return config.cacheDir;
  }
  
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'fortify', 'fcli-cache');
  } else {
    return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'fortify', 'fcli');
  }
}

/**
 * Clear cache directory
 */
export function clearCache(): void {
  const config = loadConfig();
  const cacheDir = getCacheDir(config);
  
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log(`✓ Cleared cache: ${cacheDir}`);
  } else {
    console.log(`Cache directory does not exist: ${cacheDir}`);
  }
}
