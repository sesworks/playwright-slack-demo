import { test, expect } from '@playwright/test';

test.describe('Slack Failure Notification Demo', () => {

  test('intentionally failing test for Slack alert verification', async ({ page }) => {
    // 1. Navigate to Playwright website
    await page.goto('https://playwright.dev/');

    // 2. Intentionally assert a non-existent heading to trigger a timeout failure
    const nonExistentHeading = page.getByRole('heading', { name: 'This Heading Does Not Exist' });
    
    // Playwright will retry for 5s (or configured timeout) then fail
    await expect(nonExistentHeading).toBeVisible({ timeout: 3000 });
  });

});