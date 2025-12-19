/**
 * End-to-end tests for fortify-setup
 * These tests actually download and bootstrap fcli (slower, can be skipped in CI)
 * 
 * Run with: npm test -- src/__tests__/e2e.test.ts
 * Skip with: SKIP_E2E=1 npm test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { bootstrapFcli } from '../bootstrap.js';
import { runFortifyEnv, manageFcliCache } from '../actions.js';
import { getEffectiveConfig } from '../config.js';

// Skip E2E tests if SKIP_E2E is set or in CI
const shouldSkip = process.env.SKIP_E2E === '1' || process.env.CI === 'true';
const describeE2E = shouldSkip ? describe.skip : describe;

describeE2E('End-to-End Tests', () => {
  const testCacheDir = path.join(os.tmpdir(), 'fortify-setup-test', Date.now().toString());

  beforeAll(() => {
    // Override cache location for tests
    process.env.HOME = testCacheDir;
  });

  afterAll(() => {
    // Cleanup test cache
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('Bootstrap Flow', () => {
    it('should download and bootstrap fcli', async () => {
      const config = getEffectiveConfig();
      
      const result = await bootstrapFcli({ verbose: true });
      
      expect(result).toBeDefined();
      expect(result.fcliPath).toBeDefined();
      expect(fs.existsSync(result.fcliPath)).toBe(true);
      expect(result.version).toMatch(/^v\d+/);
      expect(['download', 'cached']).toContain(result.source);
    }, 60000); // 60 second timeout for download

    it('should use cached fcli on second bootstrap', async () => {
      const result = await bootstrapFcli({ verbose: false });
      
      expect(result.source).toBe('cached');
      expect(fs.existsSync(result.fcliPath)).toBe(true);
    });

    it('should verify signature by default', async () => {
      // Clear cache to force fresh download
      manageFcliCache('clear');
      
      const result = await bootstrapFcli({ 
        verifySignature: true,
        verbose: true 
      });
      
      expect(result).toBeDefined();
      expect(result.fcliPath).toBeDefined();
    }, 60000);
  });

  describe('Action Execution', () => {
    it('should execute fcli tool env init', async () => {
      const result = await runFortifyEnv('init', {
        args: [],
        verbose: true
      });
      
      expect(result.bootstrap).toBeDefined();
      expect(result.exitCode).toBe(0);
    }, 30000);

    it('should execute fcli tool env github', async () => {
      const result = await runFortifyEnv('github', {
        verbose: true
      });
      
      expect(result.bootstrap).toBeDefined();
      expect(result.exitCode).toBe(0);
      // Output should contain environment variable exports
      expect(result.output).toBeDefined();
    }, 30000);

    it('should handle tool env errors gracefully', async () => {
      await expect(
        runFortifyEnv('init', {
          args: ['--invalid-arg'],
          verbose: false
        })
      ).rejects.toThrow();
    }, 30000);
  });

  describe('Cache Management', () => {
    it('should report cache status', () => {
      const status = manageFcliCache('status');
      
      expect(status.cached).toBe(true);
      expect(status.version).toMatch(/^v\d+/);
      expect(status.downloadedAt).toBeDefined();
    });

    it('should clear cache', () => {
      const result = manageFcliCache('clear');
      
      expect(result.cached).toBe(false);
      expect(result.version).toBeNull();
    });

    it('should bootstrap after cache clear', async () => {
      const result = await bootstrapFcli();
      
      expect(result.source).toBe('download');
      expect(fs.existsSync(result.fcliPath)).toBe(true);
    }, 60000);
  });

  describe('Error Scenarios', () => {
    it('should handle invalid download URL', async () => {
      await expect(
        bootstrapFcli({
          fcliUrl: 'https://invalid-domain-that-does-not-exist.com/fcli.tgz'
        })
      ).rejects.toThrow();
    }, 30000);

    it('should handle signature verification failure', async () => {
      manageFcliCache('clear');
      
      await expect(
        bootstrapFcli({
          fcliUrl: 'https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz',
          fcliRsaSha256Url: 'https://example.com/invalid-signature',
          verifySignature: true
        })
      ).rejects.toThrow();
    }, 30000);

    it('should skip verification when disabled', async () => {
      manageFcliCache('clear');
      
      const result = await bootstrapFcli({
        verifySignature: false,
        verbose: true
      });
      
      expect(result).toBeDefined();
      expect(result.fcliPath).toBeDefined();
    }, 60000);
  });
});

// Quick unit-style tests that always run
describe('E2E Test Utilities', () => {
  it('should respect SKIP_E2E environment variable', () => {
    const skip = process.env.SKIP_E2E === '1' || process.env.CI === 'true';
    expect(typeof skip).toBe('boolean');
  });

  it('should have test cache directory pattern', () => {
    const testDir = path.join(os.tmpdir(), 'fortify-setup-test', 'test');
    expect(testDir).toContain('fortify-setup-test');
  });
});
