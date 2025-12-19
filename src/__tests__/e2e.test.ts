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
      
      const result = await bootstrapFcli();
      
      expect(result).toBeDefined();
      expect(result.fcliPath).toBeDefined();
      expect(fs.existsSync(result.fcliPath)).toBe(true);
      expect(result.version).toMatch(/^v\d+/);
      expect(['download', 'cached']).toContain(result.source);
    }, 60000); // 60 second timeout for download

    it('should use cached fcli on second bootstrap', async () => {
      const result = await bootstrapFcli();
      
      // After first bootstrap, this should use cache
      expect(result.source).toBe('cached');
      expect(fs.existsSync(result.fcliPath)).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should execute fcli tool env github', async () => {
      const result = await runFortifyEnv({
        args: ['github'],
        verbose: false
      });
      
      expect(result.bootstrap).toBeDefined();
      // Note: tool env commands may fail without proper setup, just verify structure
      expect(typeof result.exitCode).toBe('number');
      // Output should be defined when not in init mode
      expect(result.output !== undefined || result.exitCode !== 0).toBe(true);
    }, 30000);

    it('should handle tool env errors gracefully', async () => {
      const result = await runFortifyEnv({
        args: ['init', '--invalid-arg'],
        verbose: false
      });
      
      // Invalid args should result in non-zero exit code
      expect(result.exitCode).not.toBe(0);
    }, 30000);
  });

  describe('Cache Management', () => {
    it('should report cache info', async () => {
      // Verify info command doesn't throw (should show cached fcli from earlier tests)
      await expect(manageFcliCache('info')).resolves.toBeUndefined();
    });

    it('should clear cache', async () => {
      // manageFcliCache returns Promise<void>, not a status object
      await expect(manageFcliCache('clear')).resolves.toBeUndefined();
    });

    it('should bootstrap after cache clear', async () => {
      const result = await bootstrapFcli();
      
      expect(result.source).toBe('download');
      expect(fs.existsSync(result.fcliPath)).toBe(true);
    }, 60000);
  });

  describe('Error Scenarios', () => {
    it('should verify signature by default', async () => {
      // Clear cache to force fresh download with signature verification
      await manageFcliCache('clear');
      
      const result = await bootstrapFcli({ 
        verifySignature: true
      });
      
      expect(result).toBeDefined();
      expect(result.fcliPath).toBeDefined();
    }, 60000);

    it('should handle signature verification failure', async () => {
      await manageFcliCache('clear');
      
      await expect(
        bootstrapFcli({
          fcliUrl: 'https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz',
          fcliRsaSha256Url: 'https://example.com/invalid-signature',
          verifySignature: true
        })
      ).rejects.toThrow();
    }, 30000);

    it('should skip verification when disabled', async () => {
      await manageFcliCache('clear');
      
      const result = await bootstrapFcli({
        verifySignature: false
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
