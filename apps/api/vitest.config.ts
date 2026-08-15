import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['apps/api/src/**/*.spec.ts', 'libs/crypto/src/**/*.spec.ts'],
  },
});
