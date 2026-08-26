import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/func/**/*.test.ts'],
    globalSetup: ['tests/func/global-setup.ts'],
    testTimeout: 90000,
    hookTimeout: 30000,
  },
});
