/**
 * TypeScript interfaces and types for @fortify/setup
 * 
 * DESIGN NOTE: Why @fortify/setup doesn't use fcli tool definitions
 * 
 * This module intentionally does NOT leverage fcli's tool definitions for version
 * resolution because of a bootstrap chicken-and-egg problem:
 * 
 * 1. Tool definitions are part of fcli itself
 * 2. Querying tool definitions requires fcli to be available
 * 3. But this module's purpose is to bootstrap fcli before it's available
 * 
 * Solution: Use simple version resolution for fcli bootstrap:
 * - Semantic patterns (v3, v3.6): Download from GitHub release tags
 * - Exact versions (v3.6.1): Download from specific release
 * - Latest: Query GitHub API for latest release
 * 
 * Once fcli is bootstrapped, the fortify-setup.yaml action uses tool definitions
 * for all other tools (FoD CLI, SC Client, etc.) via fcli's built-in capabilities.
 */

/**
 * Bootstrap configuration options
 */
export interface BootstrapConfig {
  /** Full download URL for fcli archive (default: derived from GitHub releases) */
  fcliUrl?: string;
  
  /** Full URL for fcli RSA SHA256 signature file (default: ${fcliUrl}.rsa_sha256) */
  fcliRsaSha256Url?: string;
  
  /** Verify signature (default: true) */
  verifySignature: boolean;
  
  /** Path to pre-installed fcli (skips download). Must be fcli 3.14.0+ */
  fcliPath?: string;
}

/**
 * Bootstrap options for runtime (merges config + env + CLI args)
 */
export interface BootstrapOptions {
  /** Override fcli download URL */
  fcliUrl?: string;
  
  /** Override RSA SHA256 signature URL */
  fcliRsaSha256Url?: string;
  
  /** Override signature verification */
  verifySignature?: boolean;
  
  /** Override fcli path */
  fcliPath?: string;
}

/**
 * Bootstrap result
 */
export interface BootstrapResult {
  /** Path to fcli executable */
  fcliPath: string;
  
  /** Fcli version */
  version: string;
  
  /** Source: configured|preinstalled|download */
  source: string;
}

/**
 * Download metadata (stored temporarily for env command access)
 */
export interface DownloadMetadata {
  /** Download URL used */
  url: string;
  
  /** Fcli version (always v3.x) */
  version: string;
  
  /** Download timestamp */
  downloadedAt: string;
}
