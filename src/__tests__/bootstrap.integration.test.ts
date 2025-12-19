/**
 * Integration tests for bootstrap functionality
 * Tests bootstrap utility functions without full HTTP mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFcliPathFromEnv, getFcliBinaryName } from '../bootstrap.js';

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

  describe('getFcliPathFromEnv', () => {
    it('should check environment variables', () => {
      // Without env vars set
      const result1 = getFcliPathFromEnv();
      expect(result1 === null || typeof result1 === 'string').toBe(true);
    });

    it('should respect FCLI environment variable', () => {
      process.env.FCLI = '/test/fcli';
      const result = getFcliPathFromEnv();
      expect(result).toBe('/test/fcli');
      delete process.env.FCLI;
    });

    it('should respect FCLI_CMD environment variable', () => {
      delete process.env.FCLI;
      process.env.FCLI_CMD = '/test/fcli-cmd';
      const result = getFcliPathFromEnv();
      expect(result).toBe('/test/fcli-cmd');
      delete process.env.FCLI_CMD;
    });

    it('should respect FCLI_HOME environment variable', () => {
      delete process.env.FCLI;
      delete process.env.FCLI_CMD;
      process.env.FCLI_HOME = '/test/fcli-home';
      const result = getFcliPathFromEnv();
      expect(result).not.toBeNull();
      if (result) {
        expect(result).toContain('/test/fcli-home');
      }
      delete process.env.FCLI_HOME;
    });

    it('should prefer FCLI over other variables', () => {
      process.env.FCLI = '/priority/fcli';
      process.env.FCLI_CMD = '/secondary/fcli';
      const result = getFcliPathFromEnv();
      expect(result).toBe('/priority/fcli');
      delete process.env.FCLI;
      delete process.env.FCLI_CMD;
    });
  });


});
