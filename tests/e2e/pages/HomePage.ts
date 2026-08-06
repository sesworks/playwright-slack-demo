import { Page, Locator, expect } from '@playwright/test';

/**
 * Represents the Playwright Documentation Homepage.
 * Encapsulates core locators and user interactions available on the homepage.
 */
export class HomePage {
  /** The Playwright test runner Page instance. */
  readonly page: Page;

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
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.searchInput = page.getByPlaceholder('Search docs');
  }

  // --- Helper Methods ---

  /**
   * Navigates to the Playwright homepage and asserts that the tab title is loaded.
   * @returns A promise that resolves when navigation and assertion complete.
   */
  async navigate(): Promise<void> {
    await this.page.goto('https://playwright.dev');
    await expect(this.page).toHaveTitle(/Playwright/);
  }

  /**
   * Alias for navigate() to ensure compatibility with journey specs calling .goto().
   */
  async goto(): Promise<void> {
    await this.navigate();
  }

  /**
   * Clicks the 'Get started' CTA link on the hero section.
   * @returns A promise that resolves when the click action completes.
   */
  async clickGetStarted(): Promise<void> {
    await this.getStartedLink.click();
  }

  /**
   * Opens the search modal and enters a search query into the input field.
   * @param query - The string to search for in the documentation.
   * @returns A promise that resolves when the query is typed and verified.
   */
  async searchDocs(query: string): Promise<void> {
    await this.searchButton.click();
    await this.searchInput.fill(query);
    await expect(this.searchInput).toHaveValue(query);
  }
}