import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkApiHealth } from './services/apiHealth';
import { INTRO_TIMING, introPlacement, shouldReleaseIntro } from './intro/introTiming';

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

describe('intro release gate', () => {
	const base = { sceneReady: true, apiSettled: true, reduced: false };

	it('holds the centred brand for the entrance plus the minimum hold', () => {
		const hold = INTRO_TIMING.entranceMs + INTRO_TIMING.holdMs;
		expect(shouldReleaseIntro({ ...base, elapsed: hold - 1 })).toBe(false);
		expect(shouldReleaseIntro({ ...base, elapsed: hold })).toBe(true);
	});

	it('keeps spinning until the city has rendered its first frame', () => {
		expect(shouldReleaseIntro({ ...base, sceneReady: false, elapsed: INTRO_TIMING.timeoutMs - 1 })).toBe(false);
	});

	it('warms a sleeping API without keeping page content hidden', () => {
		const hold = INTRO_TIMING.entranceMs + INTRO_TIMING.holdMs;
		expect(shouldReleaseIntro({ ...base, apiSettled: false, elapsed: hold })).toBe(true);
	});

	it('always opens the site at the timeout, even without a rendered scene', () => {
		expect(
			shouldReleaseIntro({ sceneReady: false, apiSettled: false, reduced: false, elapsed: INTRO_TIMING.timeoutMs })
		).toBe(true);
	});

	it('uses a shorter hold for reduced motion', () => {
		expect(shouldReleaseIntro({ ...base, reduced: true, elapsed: INTRO_TIMING.reducedHoldMs })).toBe(true);
	});
});

describe('intro placement', () => {
	it('centres the brand and enlarges it within the viewport', () => {
		const brand = { left: 24, top: 20, width: 240, height: 40 };
		const { dx, dy, scale } = introPlacement(brand, { width: 1440, height: 900 });
		expect(brand.left + brand.width / 2 + dx).toBe(720);
		expect(brand.top + brand.height / 2 + dy).toBe(450);
		expect(scale).toBeGreaterThan(2);
		expect(scale).toBeLessThanOrEqual(2.6);
	});

	it('keeps the enlarged brand inside a narrow phone viewport', () => {
		const brand = { left: 16, top: 16, width: 250, height: 40 };
		const { scale } = introPlacement(brand, { width: 375, height: 667 });
		expect(brand.width * scale).toBeLessThanOrEqual(375 * 0.86 + 0.01);
		expect(scale).toBeGreaterThan(1);
	});
});

describe('API health check', () => {
	it('reports ready when the Flask root responds', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
		const fetchMock = vi.fn().mockResolvedValue(new Response('ML Model API is running.', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(checkApiHealth()).resolves.toBe('ready');
		expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/', expect.objectContaining({ method: 'GET' }));
	});

	it('reports unavailable for an error status or network failure without throwing', async () => {
		vi.stubEnv('VITE_API_URL', 'https://api.example.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
		await expect(checkApiHealth()).resolves.toBe('unavailable');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
		await expect(checkApiHealth()).resolves.toBe('unavailable');
	});

	it('reports unconfigured without a network request when VITE_API_URL is missing', async () => {
		vi.stubEnv('VITE_API_URL', '');
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		await expect(checkApiHealth()).resolves.toBe('unconfigured');
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
