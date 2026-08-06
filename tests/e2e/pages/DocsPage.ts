// tests/e2e/pages/DocsPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DocsPage extends BasePage {
  readonly mainHeading: Locator;
  readonly sidebarNavLink: (linkName: string) => Locator;

  constructor(page: Page) {
    super(page);
    this.mainHeading = page.locator('article h1');
    this.sidebarNavLink = (linkName: string) =>
      page.getByRole('link', { name: linkName, exact: true });
  }

  async verifyHeadingContains(text: string) {
    await expect(this.mainHeading).toContainText(text);
  }

  async navigateToSidebarItem(linkName: string) {
    await this.sidebarNavLink(linkName).click();
  }
}