import { test, expect } from '@playwright/test';

test.describe('Playwright Docs Journey', () => {
    test('User can navigate from Home to Installation docs', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await expect(page).toHaveTitle(/Playwright/);
        await page.getByRole('link', { name: 'Get started' }).click();
        await expect(page).toHaveURL(/.*docs\/intro/);
        await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
    });

    test('User can search documentation using search modal', async ({ page }) => {
        await page.goto('https://playwright.dev');
        await page.getByRole('button', { name: 'Search' }).click();
        await page.getByPlaceholder('Search docs').fill('Trace Viewer');
        await expect(page.getByPlaceholder('Search docs')).toHaveValue('Trace Viewer');
        });
        });