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
import type { BootstrapConfig, BootstrapResult, BootstrapOptions, CacheMetadata } from './types.js';
import { getEffectiveConfig, getCacheDir, getConfigHash, getFcliVersion as getFcliVersionConstant } from './config.js';

const execAsync = promisify(exec);

// Fortify public key for signature verification
const FORTIFY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArij9U9yJVNc+wxn5LoH+
xQ+LYsN6v3SZJGFGkHoYIzqX8KgKr8XLhwvYmA0I2Cj6MjQWgFLGPDjVGeLfHDfq
eCEPP75Y1m0+fgb0dH3y7rFj3BbOdRJTjNGBBF9rN8rBBG38V/+bF8YYpAzCfH+q
iXzMY+j8HG/nKwH2F9RPLGMKhbIHNm4bvLH/cQDPgXPxVOKMu8f1hJAqZSZNIGvl
sLKB8wB5T5iNVRWIp2wQZXqnPBJh0hRZ2oy7ktDKuTcF+XLVQ9uEm2rnuYfFhfxh
4PL9kFOBBEqQKZ0j1tIvB7c6qV2jPSXpRYDcW9bF7WqSjfZ3CknZJPCxLfDxvGHH
OwIDAQAB
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
 * Check if fcli is available in PATH
 */
async function checkPath(): Promise<string | null> {
  try {
    const cmd = os.platform() === 'win32' ? 'where fcli' : 'which fcli';
    const { stdout } = await execAsync(cmd);
    const fcliPath = stdout.trim().split('\n')[0];
    
    if (fcliPath && fs.existsSync(fcliPath)) {
      return fcliPath;
    }
  } catch {
    // Not in PATH
  }
  
  return null;
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
 * Check CI/CD tool cache for fcli (looks for v3.x)
 */
async function checkToolCache(options: BootstrapOptions): Promise<string | null> {
  const toolCacheRoot = options.toolCacheDir || 
    process.env.RUNNER_TOOL_CACHE ||  // GitHub Actions
    process.env.AGENT_TOOLSDIRECTORY ||  // Azure DevOps
    process.env.CI_TOOL_CACHE ||  // GitLab CI
    process.env.TOOL_CACHE;  // Generic
  
  if (!toolCacheRoot || !fs.existsSync(toolCacheRoot)) {
    return null;
  }
  
  const fcliToolDir = path.join(toolCacheRoot, 'fcli');
  if (!fs.existsSync(fcliToolDir)) {
    return null;
  }
  
  // Look for any v3.x version  
  const version = getFcliVersionConstant().replace(/^v/, '');
  const arch = os.arch() === 'x64' ? 'x64' : os.arch();
  const binaryName = getFcliBinaryName();
  
  // Try various tool cache structures
  const pathVariations = [
    path.join(fcliToolDir, version, arch, 'bin', binaryName),
    path.join(fcliToolDir, version, arch, binaryName),
    path.join(fcliToolDir, version, 'bin', binaryName),
    path.join(fcliToolDir, version, binaryName)
  ];
  
  for (const fcliPath of pathVariations) {
    if (fs.existsSync(fcliPath)) {
      return fcliPath;
    }
  }
  
  return null;
}

/**
 * Verify signature using OpenSSL
 */
async function verifySignature(filePath: string, signaturePath: string): Promise<void> {
  // Write public key to temp file
  const tempKeyFile = path.join(os.tmpdir(), 'fortify-public-key.pem');
  fs.writeFileSync(tempKeyFile, FORTIFY_PUBLIC_KEY);
  
  try {
    await execAsync(
      `openssl dgst -sha256 -verify "${tempKeyFile}" -signature "${signaturePath}" "${filePath}"`,
      { timeout: 30000 }
    );
  } finally {
    if (fs.existsSync(tempKeyFile)) {
      fs.unlinkSync(tempKeyFile);
    }
  }
}

/**
 * Download file using curl
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  await execAsync(`curl -fsSL -o "${destPath}" "${url}"`, { timeout: 300000 });
}

/**
 * Extract archive
 */
async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  const isWindows = os.platform() === 'win32';
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  if (isWindows) {
    await execAsync(`tar -xf "${archivePath}" -C "${destDir}"`, { timeout: 60000 });
  } else {
    await execAsync(`tar -xzf "${archivePath}" -C "${destDir}"`, { timeout: 60000 });
  }
}

/**
 * Download and cache fcli (always latest v3.x)
 */
async function downloadAndCacheFcli(config: BootstrapConfig): Promise<string> {
  const fcliVersion = getFcliVersionConstant();
  const archiveName = getFcliArchiveName();
  const downloadUrl = `${config.baseUrl}/${fcliVersion}/${archiveName}`;
  const cacheDir = getCacheDir(config);
  const configHash = getConfigHash(config);
  
  // Cache directory structure: {cacheDir}/{configHash}/
  const versionCacheDir = path.join(cacheDir, configHash);
  const archivePath = path.join(versionCacheDir, archiveName);
  const extractDir = path.join(versionCacheDir, 'bin');
  const fcliPath = path.join(extractDir, getFcliBinaryName());
  const metadataPath = path.join(versionCacheDir, 'metadata.json');
  
  // Check if already cached and valid
  if (config.cacheEnabled && fs.existsSync(fcliPath) && fs.existsSync(metadataPath)) {
    try {
      const metadata: CacheMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      
      // Validate cache is for same config
      if (metadata.configHash === configHash) {
        // Verify binary works
        const version = await getFcliVersion(fcliPath);
        if (version) {
          return fcliPath;
        }
      }
    } catch {
      // Cache corrupted, re-download
    }
  }
  
  // Download
  console.log(`Downloading latest fcli ${fcliVersion}.x from ${downloadUrl}...`);
  
  if (!fs.existsSync(versionCacheDir)) {
    fs.mkdirSync(versionCacheDir, { recursive: true });
  }
  
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
    const signatureUrl = config.signatureUrl || `${downloadUrl}.rsa_sha256`;
    const signaturePath = `${archivePath}.rsa_sha256`;
    
    console.log(`Verifying signature from ${signatureUrl}...`);
    
    try {
      await downloadFile(signatureUrl, signaturePath);
      await verifySignature(archivePath, signaturePath);
      console.log('✓ Signature verification successful');
    } catch (error: any) {
      fs.unlinkSync(archivePath);
      throw new Error(`Signature verification failed: ${error.message}\nIf you trust the source, you can disable verification with: configure --no-verify-signature`);
    }
  }
  
  // Extract
  console.log('Extracting fcli...');
  await extractArchive(archivePath, extractDir);
  
  // Make executable (Linux/Mac)
  if (os.platform() !== 'win32') {
    fs.chmodSync(fcliPath, 0o755);
  }
  
  // Save metadata
  const metadata: CacheMetadata = {
    url: downloadUrl,
    version: fcliVersion,
    downloadedAt: new Date().toISOString(),
    configHash
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  
  // Clean up archive if caching disabled
  if (!config.cacheEnabled) {
    fs.unlinkSync(archivePath);
  }
  
  return fcliPath;
}

/**
 * Bootstrap fcli - main entry point
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
      source: 'configured'
    };
  }
  
  // 2. Check environment variables for pre-installed fcli
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
        source: 'preinstalled'
      };
    }
  }
  
  // 3. Check if fcli is in PATH
  const pathFcli = await checkPath();
  if (pathFcli) {
    const version = await getFcliVersion(pathFcli) || 'unknown';
    return {
      fcliPath: pathFcli,
      version,
      source: 'path'
    };
  }
  
  // 4. Check CI/CD tool cache
  const toolCacheFcli = await checkToolCache(options);
  if (toolCacheFcli) {
    const version = await getFcliVersion(toolCacheFcli) || 'unknown';
    return {
      fcliPath: toolCacheFcli,
      version,
      source: 'tool-cache'
    };
  }
  
  // 5. Download and cache (always latest v3.x)
  const fcliPath = await downloadAndCacheFcli(config);
  const version = await getFcliVersion(fcliPath) || getFcliVersionConstant();
  
  return {
    fcliPath,
    version,
    source: config.cacheEnabled ? 'cache' : 'download'
  };
}

/**
 * Refresh cache - force re-download
 */
export async function refreshCache(): Promise<void> {
  const config = getEffectiveConfig();
  
  if (!config.cacheEnabled) {
    console.log('Cache is disabled. Enable it with: configure --cache-enabled');
    return;
  }
  
  const cacheDir = getCacheDir(config);
  const configHash = getConfigHash(config);
  const versionCacheDir = path.join(cacheDir, configHash);
  
  // Remove cached version
  if (fs.existsSync(versionCacheDir)) {
    fs.rmSync(versionCacheDir, { recursive: true, force: true });
    console.log(`✓ Cleared cache for fcli ${getFcliVersionConstant()}.x`);
  }
  
  // Re-download
  console.log('Re-downloading latest fcli v3.x...');
  const fcliPath = await downloadAndCacheFcli(config);
  const version = await getFcliVersion(fcliPath) || getFcliVersionConstant();
  
  console.log(`✓ Refreshed fcli cache: ${version} (${fcliPath})`);
}
