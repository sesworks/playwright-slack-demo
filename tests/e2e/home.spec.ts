import { Page, Locator, expect } from '@playwright/test';

/**
 * Represents the Playwright Documentation Homepage.
 * Encapsulates core locators and user interactions available on the homepage.
 */
export class HomePage {
  /** The Playwright test runner Page instance. */
  readonly page: Page;

  /** Locator for the main hero heading text on the landing page. */
  readonly mainHeading: Locator;

  /** Locator for the main 'Get started' CTA link. */
  readonly getStartedLink: Locator;

  /** Locator for the top navigation 'Search' button. */
  readonly searchButton: Locator;

  /** Locator for the search modal text input field. */
  readonly searchInput: Locator;

  /**
   * Initializes locators for the Homepage.
   * @param page - The Playwright Page object supplied by the test fixture.
   */
  constructor(page: Page) {
    this.page = page;

    // Resilient heading locator using ARIA role heading (any level) or exact heading text
    this.mainHeading = page.getByRole('heading', { name: /Playwright enables reliable end-to-end testing/i });

    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.searchInput = page.getByPlaceholder('Search docs');
  }

  // --- Helper Methods ---

  /**
   * Navigates to the Playwright homepage and asserts that the tab title is loaded.
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://playwright.dev');
    await expect(this.page).toHaveTitle(/Playwright/);
  }

  /**
   * Alias for navigate().
   */
  async goto(): Promise<void> {
    await this.navigate();
  }

  /**
   * Verifies that the primary hero heading is visible.
   */
  async verifyHeadingVisible(): Promise<void> {
    await expect(this.mainHeading).toBeVisible();
  }

  /**
   * Clicks the 'Get started' CTA link on the hero section.
   */
  async clickGetStarted(): Promise<void> {
    await this.getStartedLink.click();
  }

  /**
   * Opens the search modal and enters a search query into the input field.
   * @param query - The string to search for in the documentation.
   */
  async searchDocs(query: string): Promise<void> {
    await this.searchButton.click();
    await this.searchInput.fill(query);
    await expect(this.searchInput).toHaveValue(query);
  }
}