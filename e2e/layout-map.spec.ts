import { expect, test } from '@playwright/test';

for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [768, 1024], [540, 720], [390, 844], [320, 740], [280, 740]]) {
	test(`section order and overflow at ${width}x${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
		await page.goto('/');
		await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
		const ids = ['top', 'models', 'customize', 'prediction', 'toronto-map', 'about'];
		const tops = await page.evaluate((sections) => sections.map((id) => document.getElementById(id)!.getBoundingClientRect().top), ids);
		expect(tops).toEqual([...tops].sort((a, b) => a - b));
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
		expect(overflow).toBe(false);
		const wheel = await page.locator('.steering svg').boundingBox();
		const gauges = await page.locator('.gauges').boundingBox();
		expect(wheel && gauges).toBeTruthy();
		await expect(page.locator('.steering svg')).toHaveAttribute('viewBox', '0 0 1400 1000');
		if (width <= 650) {
			const [rimTop, noteBottom] = await page.evaluate(() => {
				const svg = document.querySelector<SVGSVGElement>('.steering svg')!;
				const rim = document.querySelector<SVGPathElement>('.outer-rim')!;
				const svgBounds = svg.getBoundingClientRect();
				const noteBounds = document.querySelector('.metric-note')!.getBoundingClientRect();
				return [svgBounds.top + rim.getBBox().y * svgBounds.height / 1000, noteBounds.bottom];
			});
			expect(rimTop).toBeGreaterThan(noteBottom);
		}
		if (width <= 1000) await page.getByRole('button', { name: 'Open navigation menu' }).click();
		await page.getByRole('link', { name: 'Conditions', exact: true }).click();
		await expect(page).toHaveURL(/#customize$/);
		await expect(page.locator('#ROAD_CLASS')).toBeVisible();
	});
}

test('historical map preserves real totals, loads worker, and supports zoom', async ({ page }) => {
	const workerFailures: string[] = [];
	page.on('console', (message) => { if (/Worker failed/.test(message.text())) workerFailures.push(message.text()); });
	// Only the basemap is stubbed; the real bundled historical aggregates and MapLibre worker run.
	await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({
		contentType: 'image/png',
		body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/TsAAAAASUVORK5CYII=', 'base64')
	}));
	await page.goto('/');
	await page.locator('#toronto-map').scrollIntoViewIfNeeded();
	await expect(page.locator('.map-status')).toContainText('Map ready', { timeout: 20_000 });
	await expect(page.locator('.map-heading')).toContainText('4,955 geolocated collision IDs');
	await expect(page.locator('.map-footnote')).toContainText('623');
	await expect(page.locator('.map-legend')).toContainText('Cells with a fatal outcome');
	await expect(page.locator('.maplibregl-canvas')).toBeVisible();
	await page.waitForTimeout(1000);
	const before = await page.locator('.maplibregl-canvas').screenshot();
	await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
	await page.waitForTimeout(1000);
	expect((await page.locator('.maplibregl-canvas').screenshot()).equals(before)).toBe(false);
	expect(workerFailures).toEqual([]);
});

test('touch navigation and native model controls remain usable', async ({ browser }) => {
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
	const page = await context.newPage();
	await page.goto('http://127.0.0.1:4184');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	await expect(page.locator('.city')).toHaveCSS('position', 'fixed');
	await expect(page.locator('.scene-controls')).toHaveCount(0);
	await page.getByRole('button', { name: 'Open navigation menu' }).tap();
	await page.getByRole('link', { name: 'Model cockpit', exact: true }).tap();
	await page.getByRole('button', { name: 'Select K-Nearest Neighbors', exact: true }).tap();
	await expect(page.locator('#customize .form-topline')).toContainText('K-Nearest Neighbors');
	await context.close();
});
