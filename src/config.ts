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
const FCLI_VERSION = 'v3';

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
  const fcliVersion = FCLI_VERSION;
  const platform = os.platform();
  let archiveName: string;
  
  if (platform === 'win32') {
    archiveName = 'fcli-windows.zip';
  } else if (platform === 'darwin') {
    archiveName = 'fcli-mac.tgz';
  } else {
    archiveName = 'fcli-linux.tgz';
  }
  
  return {
    fcliDownloadUrl: `https://github.com/fortify/fcli/releases/download/${fcliVersion}/${archiveName}`,
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
 * Reset configuration to defaults (delete config file)
 */
export function resetConfig(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

/**
 * Get effective configuration (config file + env overrides + runtime options)
 */
export function getEffectiveConfig(options: BootstrapOptions = {}): BootstrapConfig {
  const fileConfig = loadConfig();
  
  // Environment variable overrides
  const envOverrides: Partial<BootstrapConfig> = {};
  
  if (process.env.FCLI_DOWNLOAD_URL) {
    envOverrides.fcliDownloadUrl = process.env.FCLI_DOWNLOAD_URL;
  }
  
  if (process.env.FCLI_SIGNATURE_URL) {
    envOverrides.signatureUrl = process.env.FCLI_SIGNATURE_URL;
  }
  
  if (process.env.FCLI_VERIFY_SIGNATURE !== undefined) {
    envOverrides.verifySignature = process.env.FCLI_VERIFY_SIGNATURE === 'true';
  }
  
  if (process.env.FCLI_PATH) {
    envOverrides.fcliPath = process.env.FCLI_PATH;
  }
  
  // Runtime options take highest precedence
  return {
    ...fileConfig,
    ...envOverrides,
    ...(options.fcliDownloadUrl && { fcliDownloadUrl: options.fcliDownloadUrl }),
    ...(options.signatureUrl && { signatureUrl: options.signatureUrl }),
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
    fcliDownloadUrl: config.fcliDownloadUrl,
    verifySignature: config.verifySignature
  };
  return crypto.createHash('sha256').update(JSON.stringify(relevant)).digest('hex').slice(0, 16);
}

/**
 * Get temporary directory for downloaded fcli (used by env command)
 */
export function getTempDir(): string {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'fortify', 'fcli-temp');
  } else {
    return path.join(os.tmpdir(), 'fortify', 'fcli');
  }
}


