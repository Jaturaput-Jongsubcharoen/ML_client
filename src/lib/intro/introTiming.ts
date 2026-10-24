export const INTRO_TIMING = {
	/** Logo and text entrance slides. */
	entranceMs: 500,
	/** Minimum centred hold after the entrance, while the logo spins. */
	holdMs: 2000,
	/** Shorter hold when the visitor prefers reduced motion. */
	reducedHoldMs: 900,
	/** How long a slow or sleeping API may extend the intro once the city is ready. */
	apiWaitMs: 3500,
	/** Hard cap: the site always opens, even without WebGL, the API or a rendered frame. */
	timeoutMs: 8000,
	moveMs: 850,
	revealMs: 650,
	reducedMoveMs: 220,
	reducedRevealMs: 320
} as const;

export interface IntroGateState {
	/** Milliseconds since navigation start (`performance.now()`). */
	elapsed: number;
	sceneReady: boolean;
	apiSettled: boolean;
	reduced: boolean;
}

/** Whether the centred intro may hand the brand over to the navigation bar. */
export function shouldReleaseIntro({ elapsed, sceneReady, apiSettled, reduced }: IntroGateState): boolean {
	if (elapsed >= INTRO_TIMING.timeoutMs) return true;
	const hold = reduced ? INTRO_TIMING.reducedHoldMs : INTRO_TIMING.entranceMs + INTRO_TIMING.holdMs;
	if (elapsed < hold || !sceneReady) return false;
	return apiSettled || elapsed >= INTRO_TIMING.apiWaitMs;
}

/** Scale and offset that centre the in-flow brand box in the viewport at a readable size. */
export function introPlacement(
	brand: { left: number; top: number; width: number; height: number },
	viewport: { width: number; height: number }
) {
	const fit = Math.min((viewport.width * 0.86) / brand.width, (viewport.height * 0.3) / brand.height);
	const scale = Math.max(1.1, Math.min(2.6, fit));
	return {
		dx: viewport.width / 2 - (brand.left + brand.width / 2),
		dy: viewport.height / 2 - (brand.top + brand.height / 2),
		scale
	};
}
