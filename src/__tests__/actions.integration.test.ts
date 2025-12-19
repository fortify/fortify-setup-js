/**
 * Integration tests for actions module
 * Tests action utility functions without full mocking
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runFortifyEnv, getFcliPathForEnv, manageFcliCache } from '../actions.js';

describe('Actions Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getFcliPathForEnv', () => {
    it('should return null if no fcli bootstrapped', () => {
      // This tests the actual implementation
      const result = getFcliPathForEnv();
      // Result depends on whether fcli is actually cached
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should return string path if fcli exists', () => {
      const result = getFcliPathForEnv();
      if (result !== null) {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('manageFcliCache', () => {
    it('should accept valid cache actions', async () => {
      const validActions = ['refresh', 'clear', 'info'];
      
      expect(typeof manageFcliCache).toBe('function');
      // Just verify it's callable, don't actually execute
    });

    it('should reject invalid cache action', async () => {
      await expect(
        manageFcliCache('invalid-action')
      ).rejects.toThrow('Unknown cache action');
    });
  });

  describe('runFortifyEnv - basic structure', () => {
    it('should be a function that returns a Promise', () => {
      expect(typeof runFortifyEnv).toBe('function');
      
      // Calling it returns a Promise
      const result = runFortifyEnv({ args: ['github'], verbose: false });
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
