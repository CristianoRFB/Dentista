import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tests/firestoreRules.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
