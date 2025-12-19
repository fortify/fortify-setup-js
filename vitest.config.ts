import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000, // 10s default timeout
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'examples/**',
        'src/cli.ts',
        'src/__tests__/**',
        '**/*.d.ts',
        '**/*.test.ts',
        'vitest.config.ts'
      ]
    }
  }
});
