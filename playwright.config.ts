import { defineConfig } from '@playwright/test';

const origin = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  use: { baseURL: origin },
  webServer: {
    command: 'bun tests/browser/static.ts',
    url: origin + '/post/',
  },
});
