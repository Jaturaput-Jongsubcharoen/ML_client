import { expect, test, type Locator, type Page } from '@playwright/test';
import { followFraming } from '../src/lib/scene/vehicleCamera';

// Playwright's virtual mouse starts at (0, 0), a full cursor look offset. Some headless
// Chromium builds dispatch that position to the page, so park it at the neutral centre first.
async function parkPointerAtCentre(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await page.mouse.move(Math.round(width / 2), Math.round(height / 2));
}

async function cameraNumber(canvas: Locator, name: string) {
	return Number(await canvas.getAttribute(`data-${name}`));
}

// Software WebGL on CI can render only a few frames per second, so wait on rendered frames
// rather than wall-clock time when asserting a state is stable.
async function waitForRenderedFrames(canvas: Locator, frames: number) {
	const start = await cameraNumber(canvas, 'render-count');
	await expect.poll(() => cameraNumber(canvas, 'render-count'), { timeout: 20_000 }).toBeGreaterThanOrEqual(start + frames);
}

test('one fixed city scene remains behind the page and dims after the landing', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	expect(Number(await page.locator('.city').getAttribute('data-init-ms'))).toBeGreaterThan(0);
	const heading = page.locator('#models .section-heading h2');
	const supporting = page.locator('#models .section-heading p');
	const initialHeadingColor = await heading.evaluate((node) => getComputedStyle(node).color);
	const initialSupportingColor = await supporting.evaluate((node) => getComputedStyle(node).color);
	expect(initialHeadingColor).not.toBe(initialSupportingColor);
	expect(await page.locator('#models .section-heading').evaluate((node) => getComputedStyle(node).backgroundImage)).toContain('gradient');
	expect(await page.locator('.site-header').evaluate((node) => getComputedStyle(node).backgroundImage)).toContain('linear-gradient');
	expect(await page.locator('.steering .outer-rim').evaluate((node) => getComputedStyle(node).fill)).toBe('none');
	await expect(page.locator('.cockpit')).toHaveCSS('opacity', '1');
	await page.getByRole('button', { name: /Switch to .* theme/ }).click();
	await expect.poll(async () => heading.evaluate((node) => getComputedStyle(node).color)).not.toBe(initialHeadingColor);
	await expect.poll(async () => supporting.evaluate((node) => getComputedStyle(node).color)).not.toBe(initialSupportingColor);
	await page.getByRole('button', { name: /Switch to .* theme/ }).click();
	const city = page.locator('.city');
	const canvas = city.locator('canvas');
	await expect(canvas).toHaveCount(1);
	await expect(city).toHaveCSS('position', 'fixed');
	await expect(page.locator('.scene-controls')).toHaveCount(0);
	await expect.poll(async () => Number(await canvas.getAttribute('data-draw-calls'))).toBeGreaterThan(0);
	expect(Number(await canvas.getAttribute('data-draw-calls'))).toBeLessThan(100);
	expect(await canvas.getAttribute('data-scene-quality')).toBe('desktop');
	await canvas.evaluate((node) => {
		(node as HTMLCanvasElement & { sceneIdentity?: string }).sceneIdentity = 'mounted-once';
	});

	await page.evaluate(() => {
		document.documentElement.style.scrollBehavior = 'auto';
		window.scrollTo(0, 540);
	});
	await expect.poll(async () => Number(await city.evaluate((node) => getComputedStyle(node).opacity))).toBeGreaterThan(0.25);
	await expect.poll(async () => Number(await city.evaluate((node) => getComputedStyle(node).opacity))).toBeLessThan(1);
	await page.evaluate(() => window.scrollTo(0, 900));
	await expect(city).toHaveCSS('opacity', '0.25');
	await expect(canvas).toHaveCount(1);
	expect(await canvas.evaluate((node) => (node as HTMLCanvasElement & { sceneIdentity?: string }).sceneIdentity)).toBe('mounted-once');

	await page.evaluate(() => window.scrollTo(0, 0));
	await expect(city).toHaveCSS('opacity', '1');
	expect(errors).toEqual([]);
});

test('cursor gently swings the chase camera around the followed vehicle within bounds', async ({ page }) => {
	// Look offsets ease in simulated time capped per frame; allow slow software-rendered CI frames.
	test.setTimeout(120_000);
	await parkPointerAtCentre(page, 1440, 900);
	await page.goto('/');
	const canvas = page.locator('.city canvas');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	await expect(canvas).toHaveAttribute('data-camera-mode', 'vehicle');
	const followed = await canvas.getAttribute('data-follow-vehicle');
	const movement = { timeout: 30_000 };
	const centreX = 0.5 + followFraming(1440 / 900).frameShift;
	const expectStillFollowing = async () => {
		await expect(canvas).toHaveAttribute('data-follow-vehicle', followed!);
		const x = await cameraNumber(canvas, 'vehicle-screen-x');
		const y = await cameraNumber(canvas, 'vehicle-screen-y');
		expect(Math.abs(x - centreX)).toBeLessThan(0.2);
		expect(y).toBeGreaterThan(0.5);
		expect(y).toBeLessThan(0.8);
		const pitch = await cameraNumber(canvas, 'camera-pitch');
		expect(pitch).toBeGreaterThanOrEqual(0.4);
		expect(pitch).toBeLessThanOrEqual(1.45);
		expect(await cameraNumber(canvas, 'vehicle-distance')).toBeLessThanOrEqual(40.01);
	};
	await waitForRenderedFrames(canvas, 4);
	expect(Math.abs(await cameraNumber(canvas, 'camera-look-yaw'))).toBeLessThan(0.02);
	expect(Math.abs(await cameraNumber(canvas, 'camera-look-pitch'))).toBeLessThan(0.02);

	await page.mouse.move(1438, 450);
	await expect.poll(() => cameraNumber(canvas, 'camera-look-yaw'), movement).toBeGreaterThan(0.08);
	expect(await cameraNumber(canvas, 'camera-look-yaw')).toBeLessThanOrEqual(0.12);
	await expectStillFollowing();

	await page.mouse.move(2, 450);
	await expect.poll(() => cameraNumber(canvas, 'camera-look-yaw'), movement).toBeLessThan(-0.08);
	expect(await cameraNumber(canvas, 'camera-look-yaw')).toBeGreaterThanOrEqual(-0.12);
	await expectStillFollowing();

	await page.mouse.move(720, 1);
	await expect.poll(() => cameraNumber(canvas, 'camera-look-pitch'), movement).toBeGreaterThan(0.06);
	expect(await cameraNumber(canvas, 'camera-look-pitch')).toBeLessThanOrEqual(0.1);
	await expectStillFollowing();

	// Centring the cursor eases the boom back to the neutral chase angle behind the vehicle.
	await page.mouse.move(720, 450);
	await expect.poll(async () => Math.abs(await cameraNumber(canvas, 'camera-look-yaw')), movement).toBeLessThan(0.01);
	await expect.poll(async () => Math.abs(await cameraNumber(canvas, 'camera-look-pitch')), movement).toBeLessThan(0.01);
	await expectStillFollowing();
});

for (const [width, height] of [
	[3440, 1440], [1920, 1080], [1440, 900], [1423, 675], [1024, 768],
	[768, 1024], [844, 390], [540, 720], [430, 932], [390, 844], [360, 800], [280, 740]
]) {
	test(`city follows a vehicle with a responsive chase camera at ${width}x${height}`, async ({ page }) => {
		// Huge software-rendered canvases are slow on CI.
		if (width * height > 3_000_000) test.setTimeout(120_000);
		await parkPointerAtCentre(page, width, height);
		await page.goto('/');
		await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
		const canvas = page.locator('.city canvas');
		await expect(canvas).toHaveAttribute('data-camera-mode', 'vehicle');
		const followed = await canvas.getAttribute('data-follow-vehicle');
		expect(Number(followed)).toBeGreaterThanOrEqual(0);
		// The very first frame is already the elevated diagonal chase pose, never a map view.
		const initialPitch = await cameraNumber(canvas, 'initial-camera-pitch');
		expect(initialPitch).toBeGreaterThanOrEqual(0.5);
		expect(initialPitch).toBeLessThanOrEqual(1.45);
		const framingDistance = await cameraNumber(canvas, 'camera-distance');
		expect(framingDistance).toBeGreaterThanOrEqual(34);
		expect(framingDistance).toBeLessThanOrEqual(40);
		const initialDistance = await cameraNumber(canvas, 'initial-vehicle-distance');
		expect(initialDistance).toBeGreaterThan(10);
		expect(initialDistance).toBeLessThanOrEqual(framingDistance + 0.01);
		await waitForRenderedFrames(canvas, 6);
		expect(await cameraNumber(canvas, 'vehicle-pixels')).toBeGreaterThan(15);
		const centreX = 0.5 + followFraming(width / height).frameShift;
		expect(Math.abs(await cameraNumber(canvas, 'vehicle-screen-x') - centreX)).toBeLessThan(0.15);
		expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

		await page.setViewportSize({ width: height, height: width });
		await expect.poll(async () => canvas.evaluate((node) => node.clientWidth)).toBe(height);
		await page.setViewportSize({ width, height });
		await expect.poll(async () => canvas.evaluate((node) => node.clientWidth)).toBe(width);
		await expect(canvas).toHaveAttribute('data-camera-mode', 'vehicle');
		await expect(canvas).toHaveAttribute('data-follow-vehicle', followed!);
		await expect.poll(() => cameraNumber(canvas, 'camera-distance')).toBe(framingDistance);
		await waitForRenderedFrames(canvas, 6);
		expect(Math.abs(await cameraNumber(canvas, 'vehicle-screen-x') - centreX)).toBeLessThan(0.2);
	});
}

test('theme persists, reduced motion pauses city and removes result effects', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	await expect(page.locator('.city')).toHaveAttribute('data-motion', 'reduced');
	await expect(page.locator('.scene-controls')).toHaveCount(0);
	const bounds = await page.locator('.city canvas').boundingBox();
	if (!bounds) throw new Error('City canvas is missing');
	const backgroundRegion = { x: bounds.x + bounds.width - 70, y: bounds.y + 25, width: 40, height: 40 };
	const originalScene = await page.screenshot({ clip: backgroundRegion });
	const original = await page.locator('html').getAttribute('data-theme');
	await page.getByRole('button', { name: /Switch to .* theme/ }).click();
	await expect(page.locator('html')).toHaveAttribute('data-theme', original === 'dark' ? 'light' : 'dark');
	expect((await page.screenshot({ clip: backgroundRegion })).equals(originalScene)).toBe(false);
	await page.reload();
	await expect(page.locator('html')).toHaveAttribute('data-theme', original === 'dark' ? 'light' : 'dark');
	await page.route('**/predict', (route) => route.fulfill({ json: { model: 'random_forest', prediction: 1 } }));
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.locator('.result-panel')).toBeVisible();
	await expect(page.locator('.feedback')).toHaveCSS('display', 'none');
});

test('WebGL unavailable fallback preserves prediction inputs and model selection', async ({ page }) => {
	await page.addInitScript(() => {
		const getContext = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = new Proxy(getContext, {
			apply(target, context, args) {
				if (String(args[0]).startsWith('webgl')) return null;
				return Reflect.apply(target, context, args);
			}
		});
	});
	await page.goto('/');
	await expect(page.locator('.city [role="status"]')).toContainText('Interactive 3D is unavailable');
	await page.getByRole('button', { name: 'Select Logistic Regression', exact: true }).click();
	await expect(page.locator('#customize .form-topline')).toContainText('Logistic Regression');
	await page.route('**/predict', (route) => route.fulfill({ json: { model: 'logistic_regression', prediction: 0 } }));
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.locator('.result-panel')).toHaveAttribute('data-outcome', '0');
});
