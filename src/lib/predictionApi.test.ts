import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPrediction } from './services/predictionApi';
import type { PredictionPayload } from './types';
import { modelIds } from './data/models';

const payload: PredictionPayload = {
	model_name: 'random_forest',
	input: { LATITUDE: 43.7, LONGITUDE: -79.4 }
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('prediction API contract', () => {
	it.each(modelIds)('accepts both binary labels for %s without introducing probabilities', async (model) => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		for (const prediction of [0, 1]) {
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ model, prediction }), { status: 200 })
			));
			await expect(requestPrediction({ ...payload, model_name: model })).resolves.toEqual({ model, prediction });
		}
	});

	it('rejects a response for a different model', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'svm', prediction: 1 }))));
		await expect(requestPrediction(payload)).rejects.toThrow('expected API contract');
	});

	it('reports missing configuration without making a request', async () => {
		vi.stubEnv('VITE_API_URL', '');
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await expect(requestPrediction(payload)).rejects.toThrow('not configured');
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reports network errors explicitly', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await expect(requestPrediction(payload)).rejects.toThrow('Could not reach the prediction service');
	});
	it('posts the selected model and input to the configured endpoint', async () => {
		vi.stubEnv('VITE_API_URL', 'https://ml-server2.onrender.com/');
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ model: 'random_forest', prediction: 1 }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		await expect(requestPrediction(payload)).resolves.toEqual({
			model: 'random_forest',
			prediction: 1
		});
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0][0]).toBe('https://ml-server2.onrender.com/predict');
		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(payload);
	});

	it('surfaces an API-provided error message', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: 'Invalid model name' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		await expect(requestPrediction(payload)).rejects.toThrow('Invalid model name');
	});

	it('rejects a response that does not match the binary prediction contract', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ model: 'random_forest', prediction: 0.72 }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				})
			)
		);

		await expect(requestPrediction(payload)).rejects.toThrow(
			'does not match the expected API contract'
		);
	});
});
