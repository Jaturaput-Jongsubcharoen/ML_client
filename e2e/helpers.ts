import { expect, type Page } from '@playwright/test';

/** Waits until the intro has handed off to the page and, unless disabled, the city is rendering. */
export async function waitForApp(page: Page, { city = true }: { city?: boolean } = {}) {
	if (city) await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/, { timeout: 15_000 });
}
