/**
 * Integration tests for bootstrap functionality
 * Tests bootstrap utility functions without full HTTP mocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFcliBinaryName } from '../bootstrap.js';

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

});
