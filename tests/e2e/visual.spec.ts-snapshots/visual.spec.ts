import { test, expect } from '@playwright/test';

test.describe('Visual Regression Suite', () => {
  test('Homepage UI Visual Check', async ({ page }) => {
    await page.goto('https://playwright.dev/');
    
    // Asserts page visual snapshot matches stored baseline image
    await expect(page).toHaveScreenshot('homepage-baseline.png', {
      maxDiffPixels: 100, // Trigger failure if pixel difference exceeds threshold
    });
  });
});