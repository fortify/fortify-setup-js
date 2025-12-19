/**
 * Fcli bootstrap logic
 * Downloads, verifies, caches, and locates fcli executable
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { ProxyAgent, fetch } from 'undici';
import { Readable } from 'stream';
import * as tar from 'tar';
import * as unzipper from 'unzipper';
import type { BootstrapConfig, BootstrapResult, BootstrapOptions, DownloadMetadata } from './types.js';
import { BootstrapSource } from './types.js';
import { getEffectiveConfig, getTempDir, getFcliVersion as getFcliVersionConstant, getDefaultConfig, getBootstrapBinPath } from './config.js';
import { createLogger, defaultLogger } from './logger.js';
import { formatError } from './utils.js';

const execAsync = promisify(exec);

// Fortify public key for signature verification
const FORTIFY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArij9U9yJVNc53oEMFWYp
NrXUG1UoRZseDh/p34q1uywD70RGKKWZvXIcUAZZwbZtCu4i0UzsrKRJeUwqanbc
woJvYanp6lc3DccXUN1w1Y0WOHOaBxiiK3B1TtEIH1cK/X+ZzazPG5nX7TSGh8Tp
/uxQzUFli2mDVLqaP62/fB9uJ2joX9Gtw8sZfuPGNMRoc8IdhjagbFkhFT7WCZnk
FH/4Co007lmXLAe12lQQqR/pOTeHJv1sfda1xaHtj4/Tcrq04Kx0ZmGAd5D9lA92
8pdBbzoe/mI5/Sk+nIY3AHkLXB9YAaKJf//Wb1yiP1/hchtVkfXyIaGM+cVyn7AN
VQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Detect platform and return archive name
 */
function getFcliArchiveName(): string {
  const platform = os.platform();
  
  if (platform === 'win32') {
    return 'fcli-windows.zip';
  } else if (platform === 'darwin') {
    return 'fcli-mac.tgz';
  } else {
    return 'fcli-linux.tgz';
  }
}

/**
 * Get fcli binary name for current platform
 */
export function getFcliBinaryName(): string {
  return os.platform() === 'win32' ? 'fcli.exe' : 'fcli';
}

/**
 * Get fcli version from executable
 */
export async function getFcliVersion(fcliPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`"${fcliPath}" --version`, { timeout: 5000 });
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? `v${match[1]}` : null;
  } catch {
    return null;
  }
}

/**
 * Resolve fcli path from environment variables
 * Checks FCLI, FCLI_CMD, and FCLI_HOME environment variables
 */
export function getFcliPathFromEnv(): string | null {
  const fcliEnv = process.env.FCLI || process.env.FCLI_CMD || process.env.FCLI_HOME;
  if (!fcliEnv) {
    return null;
  }
  
  // FCLI_HOME might be a directory, check for binary inside
  const potentialPath = fs.existsSync(fcliEnv) && fs.statSync(fcliEnv).isDirectory()
    ? path.join(fcliEnv, 'bin', getFcliBinaryName())
    : fcliEnv;
    
  return fs.existsSync(potentialPath) ? potentialPath : null;
}



/**
 * Get proxy agent for HTTP requests based on environment variables
 */
function getProxyAgent(): ProxyAgent | undefined {
  const proxy = process.env.HTTPS_PROXY || 
                process.env.https_proxy || 
                process.env.HTTP_PROXY || 
                process.env.http_proxy;
  
  return proxy ? new ProxyAgent(proxy) : undefined;
}

/**
 * Verify signature using Node.js crypto module
 */
async function verifySignature(filePath: string, signaturePath: string): Promise<void> {
  const verifier = crypto.createVerify('RSA-SHA256');
  const fileStream = fs.createReadStream(filePath);
  
  // Stream file through verifier
  for await (const chunk of fileStream) {
    verifier.update(chunk);
  }
  
  // Read signature file
  const signature = fs.readFileSync(signaturePath);
  
  // Verify signature
  if (!verifier.verify(FORTIFY_PUBLIC_KEY, signature)) {
    throw new Error('Signature verification failed');
  }
}

/**
 * Download file using undici with proxy support
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  const dispatcher = getProxyAgent();
  
  const response = await fetch(url, { 
    dispatcher,
    redirect: 'follow'
  });
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('Response body is empty');
  }
  
  // Ensure directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Stream response to file
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(Readable.fromWeb(response.body as any), fileStream);
}

/**
 * Extract archive using pure Node.js implementation
 */
async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (archivePath.endsWith('.zip')) {
    // Extract ZIP using unzipper package
    await pipeline(
      fs.createReadStream(archivePath),
      unzipper.Extract({ path: destDir })
    );
  } else if (archivePath.endsWith('.tgz') || archivePath.endsWith('.tar.gz')) {
    // Extract tar.gz using tar package
    await tar.extract({
      file: archivePath,
      cwd: destDir,
      strict: true
    });
  } else {
    throw new Error(`Unsupported archive format: ${archivePath}`);
  }
}

/**
 * Download and install fcli (always re-downloads latest v3.x)
 * 
 * Note: Fcli GitHub releases include semantic version tags (v3, v3.6, v3.6.1).
 * Release v3.6.1 has tags v3.6.1, v3.6, and v3 all pointing to same assets.
 * This allows downloading from /v3/ or /v3.6/ URLs for semantic version patterns.
 * 
 * The downloaded fcli is stored in an internal cache for use by the env command.
 */
async function downloadAndInstallFcli(config: BootstrapConfig): Promise<{ fcliPath: string; wasCached: boolean }> {
  const fcliVersion = getFcliVersionConstant();
  const defaultConfig = getDefaultConfig();
  const downloadUrl = config.fcliUrl || defaultConfig.fcliUrl!;
  const archiveName = getFcliArchiveName();
  const bootstrapDir = getTempDir();
  
  // Bootstrap directory structure: <home>/.fortify/fcli/bootstrap/
  const archivePath = path.join(bootstrapDir, archiveName);
  const extractDir = path.join(bootstrapDir, 'bin');
  const fcliPath = path.join(extractDir, getFcliBinaryName());
  const metadataPath = path.join(bootstrapDir, 'metadata.json');
  
  // Return existing fcli if already downloaded
  if (fs.existsSync(fcliPath)) {
    return { fcliPath, wasCached: true };
  }
  
  // Ensure bootstrap directory exists
  if (!fs.existsSync(bootstrapDir)) {
    fs.mkdirSync(bootstrapDir, { recursive: true });
  }
  
  // Download
  defaultLogger.info(`Downloading fcli from ${downloadUrl}...`);
  
  try {
    await downloadFile(downloadUrl, archivePath);
  } catch (error) {
    throw new Error(`Failed to download fcli from ${downloadUrl}: ${formatError(error)}`);
  }
  
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Download failed: ${archivePath} not found`);
  }
  
  // Verify signature if enabled
  if (config.verifySignature) {
    const fcliRsaSha256Url = config.fcliRsaSha256Url || `${downloadUrl}.rsa_sha256`;
    const signaturePath = `${archivePath}.rsa_sha256`;
    
    defaultLogger.info(`Verifying signature from ${fcliRsaSha256Url}...`);
    
    try {
      await downloadFile(fcliRsaSha256Url, signaturePath);
    } catch (error) {
      fs.unlinkSync(archivePath);
      throw new Error(`Failed to download signature from ${fcliRsaSha256Url}: ${formatError(error)}\nIf you trust the source, you can disable verification with: config --no-verify-signature`);
    }
    
    try {
      await verifySignature(archivePath, signaturePath);
      defaultLogger.info('✓ Signature verification successful');
    } catch (error) {
      fs.unlinkSync(archivePath);
      throw new Error(`Signature verification failed: ${formatError(error)}\nIf you trust the source, you can disable verification with: config --no-verify-signature`);
    }
  }
  
  // Extract
  defaultLogger.info('Extracting fcli...');
  await extractArchive(archivePath, extractDir);
  
  // Make executable (Linux/Mac)
  if (os.platform() !== 'win32') {
    fs.chmodSync(fcliPath, 0o755);
  }
  
  // Save metadata (for env command access)
  const metadata: DownloadMetadata = {
    url: downloadUrl,
    version: fcliVersion,
    downloadedAt: new Date().toISOString()
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Clean up archive
  fs.unlinkSync(archivePath);
  
  defaultLogger.info(`✓ Fcli bootstrapped to: ${bootstrapDir}`);
  
  return { fcliPath, wasCached: false };
}

/**
 * Get last downloaded fcli path (for env command after run has been executed)
 * This retrieves the fcli from the bootstrap directory.
 */
export function getLastDownloadedFcliPath(config?: BootstrapConfig): string | null {
  const bootstrapDir = getTempDir();
  const fcliPath = path.join(bootstrapDir, 'bin', getFcliBinaryName());
  
  return fs.existsSync(fcliPath) ? fcliPath : null;
}

/**
 * Bootstrap fcli - main entry point
 * 
 * Bootstrap searches for fcli in the following order:
 * 1. Configured path (via config file or FCLI_PATH env var)
 * 2. FCLI-specific environment variables (FCLI, FCLI_CMD, FCLI_HOME)
 * 3. Download latest v3.x (always re-downloads to ensure latest version)
 */
export async function bootstrapFcli(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const config = getEffectiveConfig(options);
  
  // 1. Check for explicitly configured fcli path
  if (config.fcliPath) {
    if (!fs.existsSync(config.fcliPath)) {
      throw new Error(`Configured fcli path does not exist: ${config.fcliPath}`);
    }
    const version = await getFcliVersion(config.fcliPath) || 'unknown';
    return {
      fcliPath: config.fcliPath,
      version,
      source: BootstrapSource.CONFIGURED
    };
  }
  
  // 2. Check FCLI-specific environment variables for pre-installed fcli
  const envFcliPath = getFcliPathFromEnv();
  if (envFcliPath) {
    const version = await getFcliVersion(envFcliPath) || 'unknown';
    return {
      fcliPath: envFcliPath,
      version,
      source: BootstrapSource.PREINSTALLED
    };
  }
  
  // 3. Check cache or download fcli
  const { fcliPath, wasCached } = await downloadAndInstallFcli(config);
  const version = await getFcliVersion(fcliPath) || getFcliVersionConstant();
  
  return {
    fcliPath,
    version,
    source: wasCached ? BootstrapSource.CACHED : BootstrapSource.DOWNLOAD
  };
}
