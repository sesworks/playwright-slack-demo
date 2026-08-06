import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Read environment variables from a local `.env` file into `process.env`
dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration for full configuration options.
 */
export default defineConfig({
  /**
   * Root directory where Playwright looks for test files.
   * Project-level `testDir` overrides below will refine search paths.
   */
  testDir: './tests',

  /**
   * Ignore specific demo spec files in CI environments while keeping them local.
   */
  testIgnore: process.env.CI
    ? ['**/failing-demo.spec.ts', '**/flaky-demo.spec.ts']
    : [],

  /**
   * Run all tests in parallel across files for maximum execution speed.
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if `test.only` is accidentally left in the source code.
   */
  forbidOnly: !!process.env.CI,

  /**
   * Retry failed tests up to 2 times on CI to detect/mitigate test flakiness.
   * Set to 0 in local environments for fast local debugging feedback.
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Limit parallel execution workers on CI environments (prevents resource thrashing).
   * Uses default CPU-based auto-detection in local environments.
   */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Reporter configuration for test outcome publishing:
   * 1. Built-in HTML Reporter: Generates offline dashboard (suppressed auto-open).
   * 2. Custom Slack Reporter: Intercepts failures and posts AI-analyzed cards to Slack.
   */
  reporter: [
    ['html', { open: 'never' }],
    ['./slack-reporter.ts'],
  ],

  /**
   * Shared options applied across all projects (unless overridden at project level).
   */
  use: {
    /* Collect trace logs on the first retry of a failed test for post-mortem debugging. */
    trace: 'on-first-retry',

    /* Capture a full page screenshot only when a test execution fails. */
    screenshot: 'only-on-failure',
  },

  /**
   * Configure projects for logical separation of test types (e.g., API vs Browser E2E).
   */
  projects: [
    /**
     * PROJECT 1: Fast API & Integration Testing Layer
     * Target: Backend REST endpoints without launching browser instances (ultra-fast).
     */
    {
      name: 'api',
      testDir: './tests/api',
    },

    /**
     * PROJECT 2: Browser E2E & Visual Snapshot Testing Layer
     * Target: Full end-to-end browser workflows and visual regression snapshots.
     */
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: {
        /* Emulate Desktop Chrome viewport and user agent settings */
        ...devices['Desktop Chrome'],

        /* Base URL used for relative navigation calls like `page.goto('/')` */
        baseURL: 'https://playwright.dev',
      },
    },
  ],
});