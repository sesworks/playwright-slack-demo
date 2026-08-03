import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  
  // Reporter Configuration
  reporter: [
    ['html', { open: 'never' }],
    [
      'playwright-slack-report',
      {
        channels: ['qa-reports'], // Your Slack channel name
        sendResults: 'always',    // Options: 'always' | 'on-failure' | 'off'
        showFailureWithSelection: ['issue', 'message', 'stack'],
        meta: [
          {
            key: 'Triggered By',
            value: process.env.TRIGGERED_BY || 'Local Run',
          },
          {
            key: 'Build Link',
            value: process.env.BUILD_URL || 'N/A',
          },
        ],
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