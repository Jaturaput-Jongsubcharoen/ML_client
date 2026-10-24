import { expect, test, type Page } from '@playwright/test';
import { waitForApp } from './helpers';

interface IntroSample {
	cx: number;
	cy: number;
	width: number;
	mainHidden: boolean;
	navHidden: boolean;
	overlayOpaque: boolean;
	logoAnimation: string;
}

interface IntroRecord {
	states: { state: string; firstFrame: boolean }[];
	lastLoading?: IntroSample;
}

/** Records every intro state change and the last fully styled `loading` frame, independent of page-load speed. */
async function recordIntro(page: Page) {
	await page.addInitScript(() => {
		const record: IntroRecord = { states: [] };
		(window as unknown as { __intro: IntroRecord }).__intro = record;
		new MutationObserver(() => {
			const state = document.documentElement.dataset.intro ?? 'done';
			if (record.states.at(-1)?.state === state) return;
			record.states.push({ state, firstFrame: document.querySelector<HTMLElement>('.city')?.dataset.firstFrame === 'true' });
		}).observe(document, { attributes: true, subtree: true, attributeFilter: ['data-intro'] });
		const sample = () => {
			const root = document.documentElement;
			if (!root) return void requestAnimationFrame(sample);
			const brand = document.querySelector<HTMLElement>('.site-header .brand');
			const overlay = document.querySelector<HTMLElement>('.intro-overlay');
			if (root.dataset.intro === 'loading' && root.dataset.introOwner === 'app' && brand && overlay) {
				const box = brand.getBoundingClientRect();
				const main = getComputedStyle(document.querySelector('main')!);
				const nav = getComputedStyle(document.querySelector('.site-header nav')!);
				const overlayStyle = getComputedStyle(overlay);
				record.lastLoading = {
					cx: box.x + box.width / 2,
					cy: box.y + box.height / 2,
					width: box.width,
					mainHidden: main.visibility === 'hidden' && main.opacity === '0',
					navHidden: nav.visibility === 'hidden',
					overlayOpaque: overlayStyle.display === 'block' && overlayStyle.opacity === '1',
					logoAnimation: getComputedStyle(brand.querySelector('.road-mark')!).animationName
				};
			}
			if (root.dataset.intro !== undefined || !record.lastLoading) requestAnimationFrame(sample);
		};
		requestAnimationFrame(sample);
	});
}

const readRecord = (page: Page) => page.evaluate(() => (window as unknown as { __intro: IntroRecord }).__intro);

for (const viewport of [
	{ name: 'desktop', width: 1440, height: 900 },
	{ name: 'phone', width: 390, height: 844 }
]) {
	test(`intro centres the brand, waits for the city, then docks it in the ${viewport.name} header`, async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.setViewportSize({ width: viewport.width, height: viewport.height });
		await recordIntro(page);
		await page.goto('/', { waitUntil: 'commit' });
		await waitForApp(page);

		const record = await readRecord(page);
		expect(record.states.map(({ state }) => state)).toEqual(['loading', 'moving', 'revealing', 'done']);
		// The brand only leaves the centre once the city has drawn a real frame.
		expect(record.states[1].firstFrame).toBe(true);

		const centred = record.lastLoading;
		if (!centred) throw new Error('The intro never rendered its loading state');
		expect(Math.abs(centred.cx - viewport.width / 2)).toBeLessThan(4);
		expect(Math.abs(centred.cy - viewport.height / 2)).toBeLessThan(4);
		expect(centred.width).toBeLessThanOrEqual(viewport.width);
		expect(centred).toMatchObject({ mainHidden: true, navHidden: true, overlayOpaque: true });
		expect(centred.logoAnimation).toContain('intro-quarter-turn');

		await expect(page.locator('.intro-overlay')).toHaveCount(0);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('.site-header nav')).toHaveCSS('visibility', 'visible');
		await expect(page.locator('.site-header .brand')).toHaveCSS('transform', 'none');
		await expect(page.locator('.site-header .brand')).toContainText('Prediction / Toronto / Canada');
		await expect(page).toHaveTitle('Collision Fatality Prediction / Toronto / Canada');
		const docked = await page.locator('.site-header .brand').boundingBox();
		if (!docked) throw new Error('Navigation brand is missing');
		expect(docked.y).toBeLessThan(40);
		expect(docked.x + docked.width / 2).toBeLessThan(viewport.width / 2 - 20);
		expect(docked.width).toBeLessThan(centred.width);
		const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
		expect(hasOverflow).toBe(false);
		await expect(page.locator('html')).toHaveAttribute('data-api-status', /^(ready|unavailable|unconfigured|waking)$/);
		await expect(page.getByRole('button', { name: 'Request prediction' })).toBeEnabled();
		expect(errors).toEqual([]);
	});
}

test('reduced motion uses a simplified intro that still opens the site', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await recordIntro(page);
	await page.goto('/', { waitUntil: 'commit' });
	await waitForApp(page);
	const record = await readRecord(page);
	expect(record.states.map(({ state }) => state)).toEqual(['loading', 'moving', 'revealing', 'done']);
	expect(record.lastLoading?.logoAnimation).toBe('none');
	await expect(page.locator('.site-header .brand')).toHaveCSS('opacity', '1');
	await expect(page.locator('.site-header .brand')).toHaveCSS('transform', 'none');
	await expect(page.locator('main')).toBeVisible();
});
