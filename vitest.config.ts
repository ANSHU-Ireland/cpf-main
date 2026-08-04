import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Use the React automatic runtime so JSX needs no explicit React import.
  esbuild: { jsx: 'automatic' },
  test: {
    globals: true,
    environment: 'node',
    // UI packages render in the DOM; everything else stays on the fast node env.
    environmentMatchGlobs: [
      ['packages/ui/**', 'jsdom'],
      ['apps/web/**', 'jsdom'],
    ],
    // Loads .env (e.g. DATABASE_URL) for integration tests; no-op when absent.
    setupFiles: ['dotenv/config', './vitest.setup.ui.ts'],
    // Provisions the cpf_app role + grants once (avoids concurrent DDL races).
    globalSetup: ['./vitest.globalsetup.ts'],
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx', 'apps/**/*.test.{ts,tsx}'],
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
