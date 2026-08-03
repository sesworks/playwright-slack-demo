// ============================================================================
// IMPORTS
// ============================================================================
// Import Playwright core test runner and assertion utilities
import { test, expect } from '@playwright/test';

// ============================================================================
// SUITE DECLARATION & TEST CASES
// ============================================================================
test.describe('Playwright Documentation Smoke Suite', () => {

  /**
   * TEST CASE 1: TITLE VALIDATION
   * Verifies that the home page loads correctly and contains the expected brand title.
   */
  test('has title', async ({ page }) => {
    // Navigate to the target web application homepage
    await page.goto('https://playwright.dev/');

    // Assert that the page document title matches the expected regex pattern (/Playwright/)
    await expect(page).toHaveTitle(/Playwright/);
  });

  /**
   * TEST CASE 2: NAVIGATION & HEAVY DOM CHECK
   * Verifies primary navigation CTA flows and confirms installation documentation renders.
   */
  test('get started link', async ({ page }) => {
    // Navigate to the target web application homepage
    await page.goto('https://playwright.dev/');

    // Locate and click the 'Get started' link via accessible ARIA role
    await page.getByRole('link', { name: 'Get started' }).click();

    // Assert that the target landing page contains a visible 'Installation' heading
    await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  });

});