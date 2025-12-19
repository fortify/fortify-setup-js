/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import { validateUrl, parseCliArgument, formatError } from './utils.js';

describe('validateUrl', () => {
  it('should accept valid HTTP URL', () => {
    expect(() => validateUrl('http://example.com')).not.toThrow();
  });

  it('should accept valid HTTPS URL', () => {
    expect(() => validateUrl('https://example.com/path/to/resource')).not.toThrow();
  });

  it('should accept URL with query parameters', () => {
    expect(() => validateUrl('https://example.com?key=value&foo=bar')).not.toThrow();
  });

  it('should reject invalid URL', () => {
    expect(() => validateUrl('not-a-url')).toThrow('Invalid URL: not-a-url');
  });

  it('should reject empty string', () => {
    expect(() => validateUrl('')).toThrow('Invalid URL:');
  });

  it('should use custom parameter name in error', () => {
    expect(() => validateUrl('invalid', 'fcliUrl')).toThrow('Invalid fcliUrl: invalid');
  });

  it('should accept file:// URLs', () => {
    expect(() => validateUrl('file:///path/to/file')).not.toThrow();
  });
});

describe('parseCliArgument', () => {
  it('should parse argument with equals sign', () => {
    const args = ['--url=https://example.com', '--other'];
    const [value, newIndex] = parseCliArgument(args, 0, '--url');
    
    expect(value).toBe('https://example.com');
    expect(newIndex).toBe(0);
  });

  it('should parse argument with space-separated value', () => {
    const args = ['--url', 'https://example.com', '--other'];
    const [value, newIndex] = parseCliArgument(args, 0, '--url');
    
    expect(value).toBe('https://example.com');
    expect(newIndex).toBe(1);
  });

  it('should throw error if equals sign but no value', () => {
    const args = ['--url=', '--other'];
    
    expect(() => parseCliArgument(args, 0, '--url')).toThrow('--url requires a value');
  });

  it('should throw error if no following value', () => {
    const args = ['--url'];
    
    expect(() => parseCliArgument(args, 0, '--url')).toThrow('--url requires a value');
  });

  it('should handle value at end of args array', () => {
    const args = ['--url', 'https://example.com'];
    const [value, newIndex] = parseCliArgument(args, 0, '--url');
    
    expect(value).toBe('https://example.com');
    expect(newIndex).toBe(1);
  });

  it('should preserve value with special characters', () => {
    const args = ['--url=https://example.com?key=value&foo=bar'];
    const [value, newIndex] = parseCliArgument(args, 0, '--url');
    
    // Note: split('=')[1] only gets everything after first '='
    expect(value).toBe('https://example.com?key=value&foo=bar');
    expect(newIndex).toBe(0);
  });

  it('should handle argument at different index', () => {
    const args = ['command', '--flag', '--url', 'https://example.com'];
    const [value, newIndex] = parseCliArgument(args, 2, '--url');
    
    expect(value).toBe('https://example.com');
    expect(newIndex).toBe(3);
  });
});

describe('formatError', () => {
  it('should format Error object message', () => {
    const error = new Error('Something went wrong');
    expect(formatError(error)).toBe('Something went wrong');
  });

  it('should format string error', () => {
    expect(formatError('Plain string error')).toBe('Plain string error');
  });

  it('should format number as string', () => {
    expect(formatError(404)).toBe('404');
  });

  it('should format object as string', () => {
    const obj = { code: 'ERR_NETWORK' };
    expect(formatError(obj)).toBe('[object Object]');
  });

  it('should format null', () => {
    expect(formatError(null)).toBe('null');
  });

  it('should format undefined', () => {
    expect(formatError(undefined)).toBe('undefined');
  });

  it('should handle Error subclasses', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    
    const error = new CustomError('Custom error message');
    expect(formatError(error)).toBe('Custom error message');
  });
});
