import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against the Vite app (`npm run dev`, port 5174).
 *
 * - Default `webServer`: starts **web only**. Use when API is already running.
 * - Full stack: set `PLAYWRIGHT_START_API=1` (or run `npm run test:e2e:full-app`) to start **API + web**.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const startApi =
  process.env.PLAYWRIGHT_START_API === '1' || process.env.PLAYWRIGHT_FULL_APP === '1';

export default defineConfig({
  testDir: './e2e',
  /* Full journey + signup flows can exceed default 30s */
  timeout: 120_000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: process.env.PLAYWRIGHT_ALL_BROWSERS
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
        {
          name: 'Mobile Safari',
          use: { ...devices['iPhone 12'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ],

  /* Run your local dev server before starting the tests */
  webServer: startApi
    ? [
        {
          command: 'npm run dev',
          url: process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3005/api/health',
          reuseExistingServer: !process.env.CI,
          cwd: '../api',
          timeout: 180_000,
        },
        {
          command: 'npm run dev',
          url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174',
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
        },
      ]
    : [
        {
          command: 'npm run dev',
          url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5174',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});