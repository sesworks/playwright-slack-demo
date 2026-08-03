import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Ensure 'html' is present so playwright-report/ is always generated
  reporter: [
    ['html', { open: 'never' }],
    [
      'playwright-slack-report',
      {
        channels: ['qa-reports'],
        sendResults: 'always',
        showFailureWithSelection: ['issue', 'message', 'stack'],
      },
    ],
  ],

  use: {
    baseURL: 'https://playwright.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});