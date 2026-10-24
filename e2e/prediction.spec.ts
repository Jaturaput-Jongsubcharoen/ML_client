import { expect, test } from '@playwright/test';
import { modelIds, modelNames, modelMetrics, metricLabels } from '../src/lib/data/models';
import { buildPredictionPayload, createDefaultInputs } from '../src/lib/data/features';

test.beforeEach(async ({ page }) => {
	await page.route('**/predict', (route) => route.fulfill({ json: { error: 'Unexpected request in test' }, status: 500 }));
	await page.goto('/');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
});

test('sample predictions use Random Forest immediately and then the newly selected model', async ({ page }) => {
	const payloads: unknown[] = [];
	await page.route('**/predict', async (route) => {
		const payload = route.request().postDataJSON();
		payloads.push(payload);
		expect(route.request().method()).toBe('POST');
		expect(route.request().headers()['content-type']).toBe('application/json');
		await route.fulfill({ json: { model: payload.model_name, prediction: 0 } });
	});
	await page.getByRole('link', { name: 'Predict with selected model' }).click();
	await expect(page).toHaveURL(/#prediction$/);
	await expect(page.locator('#prediction .eyebrow').first()).toHaveText('03 / Predict & view result');
	await page.getByRole('button', { name: 'Request Prediction', exact: true }).click();
	await expect(page.locator('.result-panel')).toContainText('Random Forest');
	expect(payloads[0]).toEqual(buildPredictionPayload('random_forest', createDefaultInputs()));

	await page.getByRole('button', { name: 'Select K-Nearest Neighbors', exact: true }).click();
	await page.getByRole('button', { name: 'Request Prediction', exact: true }).click();
	await expect(page.locator('.result-panel')).toContainText('K-Nearest Neighbors');
	expect(payloads[1]).toEqual(buildPredictionPayload('knn', createDefaultInputs()));
	expect(payloads).toHaveLength(2);
});

test('customization round trip validates, preserves state and submits the edited conditions', async ({ page }) => {
	const payloads: unknown[] = [];
	await page.route('**/predict', async (route) => {
		const payload = route.request().postDataJSON();
		payloads.push(payload);
		await route.fulfill({ json: { model: payload.model_name, prediction: 1 } });
	});
	await page.getByRole('button', { name: 'Select Logistic Regression', exact: true }).click();
	await page.getByRole('link', { name: 'Customize Conditions', exact: true }).click();
	await expect(page).toHaveURL(/#customize$/);
	await expect(page.locator('#customize .eyebrow')).toHaveText('04 / Customize collision conditions');
	await page.locator('#ROAD_CLASS').selectOption('Expressway');
	await page.locator('#VISIBILITY').selectOption('Rain');
	await page.locator('#latitude').fill('91');
	await page.getByRole('button', { name: 'Predict With These Conditions', exact: true }).click();
	await expect(page.locator('#latitude')).toBeFocused();
	await expect(page.locator('#latitude-error')).toBeVisible();
	expect(payloads).toHaveLength(0);
	await page.locator('#latitude').fill('43.65');
	await page.locator('#longitude').fill('-79.38');
	await page.getByRole('button', { name: 'Predict With These Conditions', exact: true }).click();
	await expect(page.locator('#prediction-heading')).toBeFocused();
	await expect(page.locator('.result-panel')).toContainText('Logistic Regression');
	await expect.poll(() => page.locator('#prediction-heading').evaluate((node) => {
		const bounds = node.getBoundingClientRect();
		return bounds.top >= 0 && bounds.bottom < innerHeight;
	})).toBe(true);
	const edited = createDefaultInputs();
	edited.categorical.ROAD_CLASS = 'Expressway';
	edited.categorical.VISIBILITY = 'Rain';
	edited.latitude = '43.65';
	edited.longitude = '-79.38';
	expect(payloads[0]).toEqual(buildPredictionPayload('logistic_regression', edited));
	await page.getByRole('link', { name: 'Customize Conditions', exact: true }).click();
	await expect(page.locator('#ROAD_CLASS')).toHaveValue('Expressway');
	await expect(page.locator('#latitude')).toHaveValue('43.65');
	await page.getByRole('button', { name: 'Request Prediction', exact: true }).click();
	await expect.poll(() => payloads.length).toBe(2);
	expect(payloads[1]).toEqual(payloads[0]);
});

test('secondary customization action uses contrasting neutral colors in both themes', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	for (const theme of ['dark', 'light']) {
		const toggle = page.getByRole('button', { name: `Switch to ${theme} theme`, exact: true });
		if (await toggle.count()) await toggle.click();
		await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
		// Keep the action out of its hover state while measuring base theme colors.
		await page.mouse.move(0, 0);
		const colors = await page.locator('.button-customize').evaluate((node) => {
			const style = getComputedStyle(node);
			const luminance = (color: string) => {
				const channels = color.match(/[\d.]+/g)!.slice(0, 3).map((value) => {
					const channel = Number(value) / 255;
					return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
				});
				return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
			};
			const background = luminance(style.backgroundColor);
			const foreground = luminance(style.color);
			return {
				background: style.backgroundColor,
				neutral: getComputedStyle(document.body).color,
				contrast: (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05)
			};
		});
		expect(colors.background).toBe(colors.neutral);
		expect(colors.contrast).toBeGreaterThanOrEqual(4.5);
		await expect(page.locator('#request-prediction')).toBeEnabled();
	}
});

test('all five modes update four exact gauges immediately and persist into the form', async ({ page }) => {
	let requests = 0;
	page.on('request', (request) => { if (request.url().endsWith('/predict')) requests++; });
	for (const model of modelIds) {
		const button = page.getByRole('button', { name: `Select ${modelNames[model]}`, exact: true });
		await button.click();
		await expect(button).toHaveAttribute('aria-pressed', 'true');
		for (const key of ['accuracy', 'precision', 'recall', 'f1'] as const) {
			await expect(page.locator(`[data-metric="${metricLabels[key]}"]`)).toHaveAttribute('aria-label', `${metricLabels[key]}: ${(modelMetrics[model][key] * 100).toFixed(2)}%`);
		}
		await expect(page.locator('#customize .form-topline')).toContainText(modelNames[model]);
		await page.getByLabel(`Information about ${modelNames[model]}`, { exact: true }).click();
		await expect(page.locator('.model-mode.active details')).toContainText(modelMetrics[model].description);
	}
	expect(requests).toBe(0);
	await expect(page.locator('#customize select')).toHaveCount(15);
	await expect(page.locator('#customize #model')).toHaveCount(0);
});

test('field Detail dialogs cover every input, track current values, and restore focus', async ({ page }) => {
	// Opens all 17 dialogs while the software-rendered city runs; ~1 s per click on loaded CI hosts.
	test.slow();
	await page.setViewportSize({ width: 280, height: 740 });
	const detailButtons = page.locator('.detail-button');
	await expect(detailButtons).toHaveCount(17);

	const roadButton = page.getByRole('button', { name: 'Detail for Road class', exact: true });
	await roadButton.click();
	const roadDialog = page.getByRole('dialog', { name: 'Road class details', exact: true });
	await expect(roadDialog).toBeVisible();
	await expect(roadDialog).toContainText('Describes the type of road where the collision occurred.');
	await expect(roadDialog).toContainText('Selected: Collector');
	await page.keyboard.press('Escape');
	await expect(roadDialog).not.toBeVisible();
	await expect(roadButton).toBeFocused();

	await page.locator('#ROAD_CLASS').selectOption({ label: 'Expressway' });
	await roadButton.click();
	await expect(roadDialog).toContainText('Selected: Expressway');
	await expect(roadDialog).toContainText('High-speed, limited-access highway for fast traffic.');
	const dialogBounds = await roadDialog.boundingBox();
	if (!dialogBounds) throw new Error('Field detail dialog has no layout box');
	expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
	expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(280);
	await page.getByRole('button', { name: 'Close Road class details', exact: true }).click();
	await expect(roadButton).toBeFocused();

	const latitudeButton = page.getByRole('button', { name: 'Detail for Latitude', exact: true });
	await page.locator('#latitude').fill('43.65');
	await latitudeButton.click();
	const latitudeDialog = page.getByRole('dialog', { name: 'Latitude details', exact: true });
	await expect(latitudeDialog).toContainText('Selected: 43.65');
	await expect(latitudeDialog).toContainText('43.65° on the north-south axis.');
	await page.keyboard.press('Escape');
	await expect(latitudeButton).toBeFocused();

	for (const button of await detailButtons.all()) {
		await button.click();
		await expect(page.locator('dialog[open]')).toBeVisible();
		await page.keyboard.press('Escape');
	}
});

test('fatal, non-fatal and repeated predictions keep snapshots and replay feedback', async ({ page }) => {
	const payloads: unknown[] = [];
	let count = 0;
	await page.route('**/predict', async (route) => {
		const payload = route.request().postDataJSON();
		payloads.push(payload);
		await route.fulfill({ json: { model: payload.model_name, prediction: count++ % 2 ? 0 : 1 } });
	});
	await page.getByRole('button', { name: 'Select Support Vector Machine', exact: true }).click();
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.getByRole('heading', { name: 'Fatal collision classification', exact: true })).toBeVisible();
	expect(payloads[0]).toEqual(buildPredictionPayload('svm', createDefaultInputs()));
	await expect(page.locator('.fracture')).toHaveCount(1);
	await expect(page.locator('.result-panel')).toContainText('Support Vector Machine');
	await page.getByRole('button', { name: 'Select Random Forest', exact: true }).click();
	await expect(page.locator('.result-panel')).toContainText('Support Vector Machine');
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.getByRole('heading', { name: 'Non-fatal collision classification', exact: true })).toBeVisible();
	await expect(page.locator('.wave')).toHaveCount(1);
	await expect(page.locator('.result-panel')).toContainText('Random Forest');
	await expect(page.locator('.result-panel')).toContainText('Non-fatal does not mean that no collision occurred');
	await expect(page.locator('.feedback')).toHaveCSS('opacity', '0', { timeout: 6000 });
	await expect(page.locator('.result-panel')).toBeVisible();
	await page.getByRole('button', { name: 'Make another prediction', exact: true }).click();
	await expect(page.locator('#ROAD_CLASS')).toBeFocused();
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.locator('.result-panel')).toHaveAttribute('data-outcome', '1');
	await page.getByRole('button', { name: 'Dismiss result' }).click();
	await expect(page.locator('.result-panel')).toHaveCount(0);
	expect(payloads).toHaveLength(3);
});

test('validation, in-flight locking, API error and retry', async ({ page }) => {
	await page.locator('#latitude').fill('91');
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.locator('#latitude')).toBeFocused();
	await expect(page.locator('#latitude-error')).toBeVisible();
	await page.locator('#latitude').fill('43.7');
	let release: () => void = () => {};
	const waiting = new Promise<void>((resolve) => { release = resolve; });
	await page.route('**/predict', async (route) => {
		await waiting;
		await route.fulfill({ status: 503, json: { error: 'Model service unavailable for test' } });
	});
	await page.getByRole('button', { name: 'Request prediction' }).click();
	await expect(page.getByRole('button', { name: 'Waiting for model' })).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Select Random Forest', exact: true })).toBeDisabled();
	await expect(page.locator('#latitude')).toBeDisabled();
	await expect(page.locator('#predict-customized')).toBeDisabled();
	release();
	await expect(page.getByRole('alert')).toContainText('Model service unavailable for test');
	await expect(page.locator('.result-panel')).toHaveCount(0);
	await page.route('**/predict', (route) => route.fulfill({ json: { model: 'random_forest', prediction: 0 } }));
	await page.getByRole('button', { name: 'Retry', exact: true }).click();
	await expect(page.locator('.result-panel')).toHaveAttribute('data-outcome', '0');
});
