/**
 * TypeScript interfaces and types for @fortify/setup
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
