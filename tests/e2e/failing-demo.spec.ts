import { test, expect } from '@playwright/test';

test.describe('Slack Failure Notification Demo', () => {

  test('intentionally failing test for Slack alert verification', async ({ page }) => {
    // 1. Navigate to Playwright website
    await page.goto('https://playwright.dev/');

    // 2. Assert a heading that actually exists on the homepage
    const realHeading = page.getByRole('heading', { name: 'Playwright enables reliable end-to-end testing for modern web apps.' });
    
    // Assert heading is visible
    await expect(realHeading).toBeVisible({ timeout: 3000 });
  });

});