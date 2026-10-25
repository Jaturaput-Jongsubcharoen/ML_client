import { expect, test } from '@playwright/test';
import { waitForApp } from './helpers';
import { followFraming } from '../src/lib/scene/vehicleCamera';

for (const [width, height] of [
	[375, 812], [400, 824], [412, 915], [430, 932], [540, 720], [768, 1024], [1024, 1366],
	[844, 390], [1024, 768], [1440, 900], [1920, 1080], [3440, 1440]
]) {
	test(`vehicle visibility and rendering budget at ${width}x${height}`, async ({ page }, testInfo) => {
		// Huge software-rendered canvases are slow on CI.
		if (width * height > 3_000_000) test.setTimeout(120_000);
		const centreX = 0.5 + followFraming(width / height).frameShift;
		await page.setViewportSize({ width, height });
		await page.goto('/');
		const canvas = page.locator('.city canvas');
		await waitForApp(page);
		await expect(canvas).toHaveAttribute('data-camera-mode', 'vehicle');
		await expect(canvas).toHaveAttribute('data-architecture-detail', 'ready');
		const snapshot = () => canvas.evaluate((node) => {
			const d = (node as HTMLCanvasElement).dataset;
			return {
				vehicleX: Number(d.vehicleX), vehicleZ: Number(d.vehicleZ),
				x: Number(d.vehicleScreenX), y: Number(d.vehicleScreenY),
				pixels: Number(d.vehiclePixels), vehicles: Number(d.vehicleCount),
				pedestrians: Number(d.pedestrianCount), buildings: Number(d.buildingCount),
				buildingMasses: Number(d.buildingMassCount),
				tier: d.performanceTier,
				calls: Number(d.drawCalls), triangles: Number(d.triangles),
				dpr: Number(d.pixelRatio), frames: Number(d.renderCount),
				renderMs: Number(d.meanRenderMs)
			};
		});
		const initial = await snapshot();
		expect(Math.abs(initial.x - centreX)).toBeLessThan(0.1);
		expect(initial.y).toBeGreaterThan(0.6);
		expect(initial.y).toBeLessThan(0.75);
		expect(initial.pixels).toBeGreaterThan(18);
		expect(initial.vehicles).toBeGreaterThanOrEqual(12);
		expect(initial.pedestrians).toBe(initial.tier === 'low' ? 8 : width <= 640 ? 10 : width <= 1100 ? 14 : 18);
		expect(initial.buildings).toBe(72);
		expect(initial.buildingMasses).toBeGreaterThan(initial.buildings);
		expect(initial.calls).toBeLessThanOrEqual(30);
		expect(initial.triangles).toBeLessThan(60_000);
		expect(initial.dpr).toBeLessThanOrEqual(width <= 640 ? 1 : width <= 1100 ? 1.1 : 1.25);
		// The followed vehicle stays clear of the landing copy: below it, or beside it on wide screens.
		const copy = await page.locator('.hero-copy').evaluate((node) => node.getBoundingClientRect().toJSON() as DOMRect);
		expect(initial.y * height > copy.bottom + 20 || initial.x * width > copy.right + 20).toBe(true);
		await expect(page.getByRole('link', { name: 'Enter the model cockpit' })).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
		await expect.poll(async () => {
			const current = await snapshot();
			return Math.hypot(current.vehicleX - initial.vehicleX, current.vehicleZ - initial.vehicleZ);
		}).toBeGreaterThan(2);
		const moving = await snapshot();
		expect(Math.abs(moving.x - centreX)).toBeLessThan(0.15);
		expect(moving.y).toBeGreaterThan(0.58);
		expect(moving.y).toBeLessThan(0.76);
		// Live motion is verified above. Pause software WebGL for the reload/state checks
		// and diagnostic screenshot, which do not depend on animation.
		await page.emulateMedia({ reducedMotion: 'reduce' });
		const selected = await canvas.getAttribute('data-follow-vehicle');
		await page.reload();
		await waitForApp(page);
		expect(await canvas.getAttribute('data-follow-vehicle')).not.toBe(selected);
		await expect(page.getByRole('button', { name: 'Select Random Forest', exact: true })).toHaveAttribute('aria-pressed', 'true');
		expect(await page.locator('#latitude').inputValue()).toBe('43.7');
		console.log(JSON.stringify({ viewport: `${width}x${height}`, initMs: await page.locator('.city').getAttribute('data-init-ms'), ...initial }));
		if (width === 400 || width === 1920) await page.screenshot({ path: testInfo.outputPath(`follow-${width}x${height}.png`) });
	});
}

test('touch exploration yields to vertical scrolling and smoothly returns to following', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 400, height: 824 }, isMobile: true, hasTouch: true
	});
	const page = await context.newPage();
	await page.goto('http://127.0.0.1:4184');
	const canvas = page.locator('.city canvas');
	await waitForApp(page);
	const cdp = await context.newCDPSession(page);
	const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) => {
		await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
	};
	await touch('touchStart', 280, 600);
	for (let x = 270; x >= 170; x -= 10) await touch('touchMove', x, 600);
	await touch('touchEnd');
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-exploration'))).toBeGreaterThan(0.1);
	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	await expect.poll(async () => Math.abs(Number(await canvas.getAttribute('data-camera-exploration'))), { timeout: 6000 }).toBeLessThan(0.015);
	await touch('touchStart', 280, 650);
	for (let y = 630; y >= 390; y -= 20) await touch('touchMove', 280, y);
	await touch('touchEnd');
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
	await expect(page.locator('.scene-controls')).toHaveCount(0);
	// Let the native fling settle before tapping the sticky menu.
	let previousScroll = -1;
	await expect.poll(async () => {
		const current = await page.evaluate(() => window.scrollY);
		const settled = current === previousScroll;
		previousScroll = current;
		return settled;
	}, { intervals: [200, 200, 200] }).toBe(true);
	await page.getByRole('button', { name: 'Open navigation menu' }).tap();
	await expect(page.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
	await page.getByRole('link', { name: 'Predict', exact: true }).tap();
	await expect(page).toHaveURL(/#prediction$/);
	await expect(page.locator('#request-prediction')).toBeVisible();
	await context.close();
});

test('capability limits, hidden-tab suspension and reduced motion prevent wasted rendering', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 });
		Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
	});
	await page.setViewportSize({ width: 400, height: 824 });
	await page.goto('/');
	const canvas = page.locator('.city canvas');
	await waitForApp(page);
	await expect(canvas).toHaveAttribute('data-performance-tier', 'low');
	await expect(canvas).toHaveAttribute('data-vehicle-count', '12');
	await expect(canvas).toHaveAttribute('data-pedestrian-count', '8');
	await expect(canvas).toHaveAttribute('data-pet-count', '1');
	await expect(canvas).toHaveAttribute('data-pixel-ratio', '1');
	const rate = await canvas.evaluate(async (node) => {
		const canvas = node as HTMLCanvasElement;
		const before = Number(canvas.dataset.renderCount);
		const start = performance.now();
		await new Promise((resolve) => setTimeout(resolve, 1500));
		return (Number(canvas.dataset.renderCount) - before) * 1000 / (performance.now() - start);
	});
	expect(rate).toBeGreaterThan(8);
	// Diagnostics are sampled at 4 Hz, allowing one sample's uncertainty around the 30 Hz cap.
	expect(rate).toBeLessThanOrEqual(35);
	console.log(JSON.stringify({
		lowCapabilityRenderedHz: Number(rate.toFixed(1)),
		meanCpuRenderSubmissionMs: await canvas.getAttribute('data-mean-render-ms'),
		drawCalls: await canvas.getAttribute('data-draw-calls'),
		triangles: await canvas.getAttribute('data-triangles')
	}));
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	const hidden = await canvas.getAttribute('data-render-count');
	await page.waitForTimeout(500);
	await expect(canvas).toHaveAttribute('data-render-count', hidden!);
	await page.evaluate(() => {
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
		document.dispatchEvent(new Event('visibilitychange'));
	});
	await expect.poll(async () => Number(await canvas.getAttribute('data-render-count'))).toBeGreaterThan(Number(hidden));
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await expect(page.locator('.city')).toHaveAttribute('data-motion', 'reduced');
	const position = await canvas.getAttribute('data-vehicle-x');
	await page.waitForTimeout(600);
	await expect(canvas).toHaveAttribute('data-vehicle-x', position!);
});
