import type { ModelId, PredictionPayload, PredictionResponse } from '../types';
import { getApiBaseUrl } from './apiBase';

const REQUEST_TIMEOUT_MS = 90_000;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export async function requestPrediction(
	payload: PredictionPayload
): Promise<PredictionResponse> {
	const baseUrl = getApiBaseUrl();
	if (!baseUrl) {
		throw new Error('Prediction service is not configured. Set VITE_API_URL for this deployment.');
	}

	const controller = new AbortController();
	const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	let response: Response;

	try {
		response = await fetch(`${baseUrl}/predict`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			signal: controller.signal
		});
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new Error(
				'The prediction request timed out. The Render service may still be starting; please retry.',
				{ cause: error }
			);
		}
		if (error instanceof Error) {
			throw new Error(`Could not reach the prediction service: ${error.message}`, { cause: error });
		}
		throw new Error('Could not reach the prediction service due to an unknown network error.', {
			cause: error
		});
	} finally {
		globalThis.clearTimeout(timeout);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(
			`The prediction service returned an unreadable response (HTTP ${response.status}).`,
			{ cause: error }
		);
	}

	if (!response.ok) {
		const message = isRecord(data) && typeof data.error === 'string' ? data.error : '';
		throw new Error(message || `Prediction request failed with HTTP ${response.status}.`);
	}

	if (
		!isRecord(data) ||
		!isModelId(data.model) ||
		data.model !== payload.model_name ||
		(data.prediction !== 0 && data.prediction !== 1)
	) {
		throw new Error('The prediction service returned data that does not match the expected API contract.');
	}

	return { model: data.model, prediction: data.prediction };
}

function isModelId(value: unknown): value is ModelId {
	return (
		value === 'random_forest' ||
		value === 'knn' ||
		value === 'svm' ||
		value === 'neural_network' ||
		value === 'logistic_regression'
	);
}
