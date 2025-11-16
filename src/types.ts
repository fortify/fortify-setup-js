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
  /** Base URL for downloading fcli (default: GitHub releases) */
  baseUrl: string;
  
  /** Enable caching (default: true for interactive, false in CI) */
  cacheEnabled: boolean;
  
  /** Custom cache directory (default: ~/.cache/fortify/fcli) */
  cacheDir?: string;
  
  /** Verify signature (default: true) */
  verifySignature: boolean;
  
  /** Custom signature URL pattern (default: ${baseUrl}/${version}/${archive}.rsa_sha256) */
  signatureUrl?: string;
  
  /** Path to pre-installed fcli (skips download) */
  fcliPath?: string;
}

/**
 * Bootstrap options for runtime (merges config + env + CLI args)
 */
export interface BootstrapOptions {
  /** Override base URL */
  baseUrl?: string;
  
  /** Override cache enabled */
  cacheEnabled?: boolean;
  
  /** Override cache directory */
  cacheDir?: string;
  
  /** Override signature verification */
  verifySignature?: boolean;
  
  /** Override fcli path */
  fcliPath?: string;
  
  /** Tool cache directory (CI/CD runners) */
  toolCacheDir?: string;
}

/**
 * Bootstrap result
 */
export interface BootstrapResult {
  /** Path to fcli executable */
  fcliPath: string;
  
  /** Fcli version */
  version: string;
  
  /** Source: path|preinstalled|tool-cache|cache|download */
  source: string;
  
  /** Self type for fcli action: stable (pre-installed) or unstable (downloaded) */
  selfType: 'stable' | 'unstable';
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  /** Download URL used */
  url: string;
  
  /** Fcli version (always v3.x) */
  version: string;
  
  /** Download timestamp */
  downloadedAt: string;
  
  /** Configuration hash (to detect config changes) */
  configHash: string;
}
