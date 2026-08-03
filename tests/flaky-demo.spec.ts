import { test, expect } from '@playwright/test';

test.describe('Quality Health Bot Demo', () => {

  test('simulate flaky network/element behavior', async ({ page }, testInfo) => {
    await page.goto('https://playwright.dev/');

    // Check Playwright's built-in retry attempt index (0 = initial run, 1 = first retry)
    if (testInfo.retry === 0) {
      console.log('⚡ Attempt #1: Simulating a transient network/selector failure...');
      // Force an assertion error on the first attempt
      expect(testInfo.retry).toBe(99);
    }

    // On Retry #1 (testInfo.retry > 0), the test reaches this line and passes cleanly!
    console.log('✅ Attempt #2 (Retry): Passing cleanly on retry!');
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });

});