import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Loads .env (e.g. DATABASE_URL) for integration tests; no-op when absent.
    setupFiles: ['dotenv/config'],
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json'],
      // Safety/authority invariant modules require 100% branch coverage.
      thresholds: {
        'packages/domain/src/invariants/**': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
        'packages/policy/src/authorize.ts': {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
  },
});
