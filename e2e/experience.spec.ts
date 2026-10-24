import { expect, test } from '@playwright/test';
import { usesVehicleCamera } from '../src/lib/scene/vehicleCamera';

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
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/');
	const canvas = page.locator('.city canvas');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
	const initialYaw = Number(await canvas.getAttribute('data-camera-yaw'));
	const initialPitch = Number(await canvas.getAttribute('data-camera-pitch'));
	expect(Number(await canvas.getAttribute('data-camera-range-degrees'))).toBeGreaterThan(180);

	await page.mouse.move(2, 450);
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-yaw')), {
		timeout: 3000
	}).toBeLessThan(initialYaw - 0.35);
	const leftYaw = Number(await canvas.getAttribute('data-camera-yaw'));

	await page.mouse.move(1438, 450);
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-yaw')), {
		timeout: 3000
	}).toBeGreaterThan(leftYaw + 0.6);

	await page.mouse.move(720, 1);
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-pitch')), {
		timeout: 2500
	}).toBeGreaterThan(initialPitch + 0.04);
	const upperPitch = Number(await canvas.getAttribute('data-camera-pitch'));

	await page.mouse.move(720, 899);
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-pitch')), {
		timeout: 2500
	}).toBeLessThan(upperPitch - 0.08);
	const lowerPitch = Number(await canvas.getAttribute('data-camera-pitch'));
	expect(lowerPitch).toBeGreaterThan(0);

	await page.mouse.move(720, 450);
	await expect.poll(async () => Number(await canvas.getAttribute('data-camera-pitch'))).toBeCloseTo(initialPitch, 2);
	const centeredYaw = Number(await canvas.getAttribute('data-camera-yaw'));
	await page.waitForTimeout(300);
	expect(Number(await canvas.getAttribute('data-camera-yaw'))).toBeCloseTo(centeredYaw, 2);

	await page.setViewportSize({ width: 390, height: 844 });
	await expect.poll(async () => canvas.evaluate((node) => node.clientWidth)).toBe(390);
	await expect.poll(async () => canvas.evaluate((node) => node.clientHeight)).toBe(844);
});

for (const [width, height] of [
	[3440, 1440], [1920, 1080], [1440, 900], [1423, 675], [1024, 768],
	[768, 1024], [844, 390], [540, 720], [430, 932], [390, 844], [360, 800], [280, 740]
]) {
	test(`city starts in its responsive camera mode at ${width}x${height}`, async ({ page }) => {
		await page.setViewportSize({ width, height });
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
		await page.waitForTimeout(300);
		await expect(canvas).toHaveAttribute('data-camera-yaw', '0.650');
		await expect(canvas).toHaveAttribute('data-camera-pitch', '0.600');
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
