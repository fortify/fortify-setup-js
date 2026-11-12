/**
 * Integration tests for bootstrap functionality
 * Tests bootstrap utility functions without full HTTP mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fetch } from 'undici';
import { bootstrapFcli, getFcliBinaryName } from '../bootstrap.js';

vi.mock('undici', () => ({
  fetch: vi.fn(),
  ProxyAgent: vi.fn()
}));

describe('Bootstrap Integration Tests', () => {
  const originalEnv = process.env;
  const originalPlatform = process.platform;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('getFcliBinaryName', () => {
    it('should return fcli.exe on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      expect(getFcliBinaryName()).toBe('fcli.exe');
    });

    it('should return fcli on Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(getFcliBinaryName()).toBe('fcli');
    });

    it('should return fcli on macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      expect(getFcliBinaryName()).toBe('fcli');
    });
  });

  describe('download failures', () => {
    const releaseUrl = 'https://github.com/fortify/fcli/releases/download/v3.0.0';
    let cacheDir: string;

    beforeEach(() => {
      cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fcli-bootstrap-test-'));
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 404, statusText: 'Not Found' } as any);
    });

    afterEach(() => {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      vi.mocked(fetch).mockReset();
    });

    it('should explain missing Linux arm64 binary', async () => {
      await expect(bootstrapFcli({ cacheDir, fcliUrl: `${releaseUrl}/fcli-linux-arm64.tgz` }))
        .rejects.toThrow("the requested fcli release doesn't provide a Linux arm64 binary");
    });

    it('should report HTTP status for other missing archives', async () => {
      await expect(bootstrapFcli({ cacheDir, fcliUrl: `${releaseUrl}/fcli-linux.tgz` }))
        .rejects.toThrow(`Failed to download fcli from ${releaseUrl}/fcli-linux.tgz: Download failed: 404 Not Found`);
    });
  });

});
