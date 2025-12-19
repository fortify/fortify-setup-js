/**
 * Tests for logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, defaultLogger } from './logger.js';

describe('createLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create logger with info method', () => {
    const logger = createLogger();
    logger.info('test message');
    
    expect(consoleLogSpy).toHaveBeenCalledWith('test message');
  });

  it('should create logger with warn method', () => {
    const logger = createLogger();
    logger.warn('warning message');
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('warning message');
  });

  it('should create logger with error method', () => {
    const logger = createLogger();
    logger.error('error message');
    
    expect(consoleErrorSpy).toHaveBeenCalledWith('error message');
  });

  it('should not log verbose messages when verbose is false', () => {
    const logger = createLogger(false);
    logger.verbose('verbose message');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should log verbose messages when verbose is true', () => {
    const logger = createLogger(true);
    logger.verbose('verbose message');
    
    expect(consoleLogSpy).toHaveBeenCalledWith('verbose message');
  });

  it('should default to non-verbose mode', () => {
    const logger = createLogger();
    logger.verbose('should not appear');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});

describe('defaultLogger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be non-verbose by default', () => {
    defaultLogger.verbose('should not log');
    
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should have all logger methods available', () => {
    expect(defaultLogger.info).toBeDefined();
    expect(defaultLogger.warn).toBeDefined();
    expect(defaultLogger.error).toBeDefined();
    expect(defaultLogger.verbose).toBeDefined();
  });
});
