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
import { getEffectiveConfig, getTempDir, getConfigHash, getFcliVersion as getFcliVersionConstant, getDefaultConfig } from './config.js';

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
 * Get fcli binary name
 */
function getFcliBinaryName(): string {
  return os.platform() === 'win32' ? 'fcli.exe' : 'fcli';
}



/**
 * Get fcli version from executable
 */
async function getFcliVersion(fcliPath: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`"${fcliPath}" --version`, { timeout: 5000 });
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? `v${match[1]}` : null;
  } catch {
    return null;
  }
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
async function downloadAndInstallFcli(config: BootstrapConfig): Promise<string> {
  const fcliVersion = getFcliVersionConstant();
  const defaultConfig = getDefaultConfig();
  const downloadUrl = config.fcliUrl || defaultConfig.fcliUrl!;
  const archiveName = getFcliArchiveName();
  const tempDir = getTempDir();
  const configHash = getConfigHash(config);
  
  // Temp directory structure: {tempDir}/{configHash}/
  const versionTempDir = path.join(tempDir, configHash);
  const archivePath = path.join(versionTempDir, archiveName);
  const extractDir = path.join(versionTempDir, 'bin');
  const fcliPath = path.join(extractDir, getFcliBinaryName());
  const metadataPath = path.join(versionTempDir, 'metadata.json');
  
  // Always download fresh copy to ensure latest version within v3.x
  // Remove any existing temp copy
  if (fs.existsSync(versionTempDir)) {
    fs.rmSync(versionTempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(versionTempDir, { recursive: true });
  
  // Download
  console.log(`Downloading fcli from ${downloadUrl}...`);
  
  try {
    await downloadFile(downloadUrl, archivePath);
  } catch (error: any) {
    throw new Error(`Failed to download fcli from ${downloadUrl}: ${error.message}`);
  }
  
  if (!fs.existsSync(archivePath)) {
    throw new Error(`Download failed: ${archivePath} not found`);
  }
  
  // Verify signature if enabled
  if (config.verifySignature) {
    const fcliRsaSha256Url = config.fcliRsaSha256Url || `${downloadUrl}.rsa_sha256`;
    const signaturePath = `${archivePath}.rsa_sha256`;
    
    console.log(`Verifying signature from ${fcliRsaSha256Url}...`);
    
    try {
      await downloadFile(fcliRsaSha256Url, signaturePath);
    } catch (error: any) {
      fs.unlinkSync(archivePath);
      throw new Error(`Failed to download signature from ${fcliRsaSha256Url}: ${error.message}\nIf you trust the source, you can disable verification with: config --no-verify-signature`);
    }
    
    try {
      await verifySignature(archivePath, signaturePath);
      console.log('✓ Signature verification successful');
    } catch (error: any) {
      fs.unlinkSync(archivePath);
      // Avoid redundant "Signature verification failed: Signature verification failed"
      const errorMsg = error.message.toLowerCase().includes('signature verification failed') 
        ? error.message 
        : `Signature verification failed: ${error.message}`;
      throw new Error(`${errorMsg}\nIf you trust the source, you can disable verification with: config --no-verify-signature`);
    }
  }
  
  // Extract
  console.log('Extracting fcli...');
  await extractArchive(archivePath, extractDir);
  
  // Make executable (Linux/Mac)
  if (os.platform() !== 'win32') {
    fs.chmodSync(fcliPath, 0o755);
  }
  
  // Save metadata (for env command access)
  const metadata: DownloadMetadata = {
    url: downloadUrl,
    version: fcliVersion,
    downloadedAt: new Date().toISOString(),
    configHash
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Clean up archive
  fs.unlinkSync(archivePath);
  
  return fcliPath;
}

/**
 * Get last downloaded fcli path (for env command after run has been executed)
 * This retrieves the fcli from the temp directory that was downloaded during the last run command.
 */
export function getLastDownloadedFcliPath(config?: BootstrapConfig): string | null {
  const effectiveConfig = config || getEffectiveConfig();
  const tempDir = getTempDir();
  const configHash = getConfigHash(effectiveConfig);
  const versionTempDir = path.join(tempDir, configHash);
  const extractDir = path.join(versionTempDir, 'bin');
  const fcliPath = path.join(extractDir, getFcliBinaryName());
  
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
      source: 'configured',
      selfType: 'stable'
    };
  }
  
  // 2. Check FCLI-specific environment variables for pre-installed fcli
  const fcliEnv = process.env.FCLI || process.env.FCLI_CMD || process.env.FCLI_HOME;
  if (fcliEnv) {
    // FCLI_HOME might be a directory, check for binary inside
    const fcliPath = fs.existsSync(fcliEnv) && fs.statSync(fcliEnv).isDirectory()
      ? path.join(fcliEnv, 'bin', getFcliBinaryName())
      : fcliEnv;
    
    if (fs.existsSync(fcliPath)) {
      const version = await getFcliVersion(fcliPath) || 'unknown';
      return {
        fcliPath,
        version,
        source: 'preinstalled',
        selfType: 'stable'
      };
    }
  }
  
  // 3. Download fcli (always re-downloads latest v3.x to ensure latest version is used)
  const fcliPath = await downloadAndInstallFcli(config);
  const version = await getFcliVersion(fcliPath) || getFcliVersionConstant();
  
  return {
    fcliPath,
    version,
    source: 'download',
    selfType: 'unstable'
  };
}
