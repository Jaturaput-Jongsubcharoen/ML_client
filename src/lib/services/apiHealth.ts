import { getApiBaseUrl } from './apiBase';

export type ApiStatus = 'ready' | 'unavailable' | 'unconfigured';

const HEALTH_TIMEOUT_MS = 60_000;

/**
 * Probes the Flask root route (`GET /`). It never throws, so callers can treat the backend
 * as optional; a slow probe also wakes a sleeping Render instance before the first prediction.
 */
export async function checkApiHealth(timeoutMs = HEALTH_TIMEOUT_MS): Promise<ApiStatus> {
	const baseUrl = getApiBaseUrl();
	if (!baseUrl) return 'unconfigured';

	const controller = new AbortController();
	const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(`${baseUrl}/`, {
			method: 'GET',
			cache: 'no-store',
			signal: controller.signal
		});
		return response.ok ? 'ready' : 'unavailable';
	} catch {
		return 'unavailable';
	} finally {
		globalThis.clearTimeout(timeout);
	}
}
