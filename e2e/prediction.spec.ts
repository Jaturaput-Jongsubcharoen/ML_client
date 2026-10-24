import { expect, test } from '@playwright/test';
import { modelIds, modelNames, modelMetrics, metricLabels } from '../src/lib/data/models';
import { buildPredictionPayload, createDefaultInputs } from '../src/lib/data/features';

test.beforeEach(async ({ page }) => {
	await page.route('**/predict', (route) => route.fulfill({ json: { error: 'Unexpected request in test' }, status: 500 }));
	await page.goto('/');
	await expect(page.locator('.city')).toHaveAttribute('data-ready', 'true');
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
	release();
	await expect(page.getByRole('alert')).toContainText('Model service unavailable for test');
	await expect(page.locator('.result-panel')).toHaveCount(0);
	await page.route('**/predict', (route) => route.fulfill({ json: { model: 'random_forest', prediction: 0 } }));
	await page.getByRole('button', { name: 'Retry', exact: true }).click();
	await expect(page.locator('.result-panel')).toHaveAttribute('data-outcome', '0');
});
