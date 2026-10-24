import { expect, test, type Locator, type Page } from '@playwright/test';
import { usesVehicleCamera } from '../src/lib/scene/vehicleCamera';

// Playwright's virtual mouse starts at (0, 0), inside the top-left orbit band. Some headless
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

test('city camera tracks viewport edges within a wide, bounded orbit', async ({ page }) => {
	// Edge orbit advances in simulated time capped per frame; allow slow software-rendered CI frames.
	test.setTimeout(120_000);
	await parkPointerAtCentre(page, 1440, 900);
	await page.goto('/');
	const canvas = page.locator('.city canvas');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	await expect(canvas).toHaveAttribute('data-camera-mode', 'overview');
	const initialYaw = Number(await canvas.getAttribute('data-initial-camera-yaw'));
	const initialPitch = Number(await canvas.getAttribute('data-initial-camera-pitch'));
	expect(initialYaw).toBe(0.65);
	expect(initialPitch).toBe(0.6);
	await expect(canvas).toHaveAttribute('data-camera-yaw', '0.650');
	await expect(canvas).toHaveAttribute('data-camera-pitch', '0.600');
	const rangeDegrees = await cameraNumber(canvas, 'camera-range-degrees');
	expect(rangeDegrees).toBeGreaterThan(180);
	const halfRange = (rangeDegrees / 2) * Math.PI / 180;
	const expectYawWithinOrbit = async () => {
		const yaw = await cameraNumber(canvas, 'camera-yaw');
		expect(yaw).toBeGreaterThanOrEqual(initialYaw - halfRange - 0.002);
		expect(yaw).toBeLessThanOrEqual(initialYaw + halfRange + 0.002);
		return yaw;
	};
	const movement = { timeout: 30_000 };

	await page.mouse.move(2, 450);
	await expect.poll(() => cameraNumber(canvas, 'camera-yaw'), movement).toBeLessThan(initialYaw - 0.35);
	const leftYaw = await expectYawWithinOrbit();

	await page.mouse.move(1438, 450);
	await expect.poll(() => cameraNumber(canvas, 'camera-yaw'), movement).toBeGreaterThan(leftYaw + 0.6);
	await expectYawWithinOrbit();

	await page.mouse.move(720, 1);
	await expect.poll(() => cameraNumber(canvas, 'camera-pitch'), movement).toBeGreaterThan(initialPitch + 0.04);
	const upperPitch = await cameraNumber(canvas, 'camera-pitch');
	expect(upperPitch).toBeLessThanOrEqual(0.9);

	await page.mouse.move(720, 899);
	await expect.poll(() => cameraNumber(canvas, 'camera-pitch'), movement).toBeLessThan(upperPitch - 0.08);
	const lowerPitch = await cameraNumber(canvas, 'camera-pitch');
	expect(lowerPitch).toBeGreaterThanOrEqual(0.32);

	// Centring stops edge motion: pitch eases back to neutral while accumulated edge yaw is kept.
	await page.mouse.move(720, 450);
	await expect.poll(() => cameraNumber(canvas, 'camera-pitch'), movement).toBeCloseTo(initialPitch, 2);
	let settledYaw = Number.NaN;
	await expect.poll(async () => {
		const before = await cameraNumber(canvas, 'camera-yaw');
		await waitForRenderedFrames(canvas, 4);
		settledYaw = await cameraNumber(canvas, 'camera-yaw');
		return Math.abs(settledYaw - before);
	}, movement).toBeLessThan(0.006);
	await expectYawWithinOrbit();
	expect(settledYaw).toBeGreaterThan(leftYaw + 0.5);
	await waitForRenderedFrames(canvas, 6);
	expect(await cameraNumber(canvas, 'camera-yaw')).toBeCloseTo(settledYaw, 2);

	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(async () => canvas.evaluate((node) => node.clientWidth)).toBe(390);
	await expect.poll(async () => canvas.evaluate((node) => node.clientHeight)).toBe(844);
});

for (const [width, height] of [
	[3440, 1440], [1920, 1080], [1440, 900], [1423, 675], [1024, 768],
	[768, 1024], [844, 390], [540, 720], [430, 932], [390, 844], [360, 800], [280, 740]
]) {
	test(`city starts in its responsive camera mode at ${width}x${height}`, async ({ page }) => {
		await parkPointerAtCentre(page, width, height);
		await page.goto('/');
		await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
		const canvas = page.locator('.city canvas');
		const followsVehicle = usesVehicleCamera(width, height);
		await expect(canvas).toHaveAttribute('data-camera-mode', followsVehicle ? 'vehicle' : 'overview');
		await expect(canvas).toHaveAttribute('data-initial-camera-yaw', '0.650');
		await expect(canvas).toHaveAttribute('data-initial-camera-pitch', '0.600');
		await expect(canvas).toHaveAttribute('data-building-count', '72');
		if (width === 1423) {
			const composition = await canvas.evaluate((node) => {
				const value = (node as HTMLCanvasElement).dataset.initialCameraComposition;
				if (!value) throw new Error('Initial camera composition was not captured');
				return JSON.parse(value) as { towerTipX: number; towerTipY: number; towerHeight: number };
			});
			expect(composition.towerTipX).toBeGreaterThan(0.18);
			expect(composition.towerTipX).toBeLessThan(0.3);
			expect(composition.towerTipY).toBeGreaterThan(0.15);
			expect(composition.towerTipY).toBeLessThan(0.35);
			expect(composition.towerHeight).toBeGreaterThan(0.32);
		}
		const distance = Number(await canvas.getAttribute('data-camera-distance'));
		if (followsVehicle) {
			expect(distance).toBeGreaterThan(38);
			expect(distance).toBeLessThan(50);
			expect(Number(await canvas.getAttribute('data-vehicle-pixels'))).toBeGreaterThan(15);
		} else {
			expect(distance).toBeGreaterThan(250);
		}
		// With the pointer neutral, the live camera must hold the first-frame pose across rendered frames.
		await waitForRenderedFrames(canvas, 6);
		expect(await canvas.getAttribute('data-camera-yaw')).toBe('0.650');
		expect(await canvas.getAttribute('data-camera-pitch')).toBe('0.600');
		expect(Number(await canvas.getAttribute('data-camera-distance'))).toBe(distance);
		await page.setViewportSize({ width: height, height: width });
		await expect.poll(async () => canvas.evaluate((node) => node.clientWidth)).toBe(height);
		await page.setViewportSize({ width, height });
		await expect(canvas).toHaveAttribute('data-camera-mode', followsVehicle ? 'vehicle' : 'overview');
		if (!followsVehicle) await expect.poll(async () => Number(await canvas.getAttribute('data-camera-distance'))).toBe(distance);
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
