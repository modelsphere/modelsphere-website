import { defineConfig } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testDir: 'tests/pages',
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        ...config.webServer,
        command: 'SITE_BASE_URL=/modelsphere-website/ pnpm serve',
        port: 4173,
      },
  use: {
    ...config.use,
    baseURL: new URL(
      '/modelsphere-website/',
      process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    ).href,
  },
});
