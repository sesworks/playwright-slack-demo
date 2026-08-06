// tests/e2e/journey.spec.ts
import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { DocsPage } from './pages/DocsPage';

test.describe('E2E User Journey: Navigation & Docs Search', () => {
  let homePage: HomePage;
  let docsPage: DocsPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    docsPage = new DocsPage(page);
  });

  test('User completes onboarding journey from Homepage to Writing Tests guide', async ({ page }) => {
    // Step 1: Land on Home Page
    await homePage.goto();
    await expect(page).toHaveTitle(/Playwright/);

    // Step 2: Click "Get Started" to navigate into the Documentation flow
    await homePage.clickGetStarted();
    await expect(page).toHaveURL(/.*docs\/intro/);

    // Step 3: Verify initial documentation landing state
    await docsPage.verifyHeadingContains('Installation');

    // Step 4: Multi-step sidebar navigation across doc topics
    await docsPage.navigateToSidebarItem('Writing tests');
    await expect(page).toHaveURL(/.*docs\/writing-tests/);
    await docsPage.verifyHeadingContains('Writing tests');

    // Step 5: Navigate further into locators guide
    await docsPage.navigateToSidebarItem('Locators');
    await expect(page).toHaveURL(/.*docs\/locators/);
    await docsPage.verifyHeadingContains('Locators');
  });
});