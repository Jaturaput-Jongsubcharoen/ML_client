export const INTRO_TIMING = {
	/** Logo and text entrance slides. */
	entranceMs: 400,
	/** Minimum centred hold after the entrance, while the logo spins. */
	holdMs: 650,
	/** Shorter hold when the visitor prefers reduced motion. */
	reducedHoldMs: 300,
	/** Hard cap: the site always opens, even without WebGL, the API or a rendered frame. */
	timeoutMs: 3500,
	moveMs: 300,
	revealMs: 250,
	reducedMoveMs: 160,
	reducedRevealMs: 220
} as const;

export interface IntroGateState {
	/** Milliseconds since navigation start (`performance.now()`). */
	elapsed: number;
	sceneReady: boolean;
	apiSettled: boolean;
	reduced: boolean;
}

/** Whether the centred intro may hand the brand over to the navigation bar. */
export function shouldReleaseIntro({ elapsed, sceneReady, reduced }: IntroGateState): boolean {
	if (elapsed >= INTRO_TIMING.timeoutMs) return true;
	const hold = reduced ? INTRO_TIMING.reducedHoldMs : INTRO_TIMING.entranceMs + INTRO_TIMING.holdMs;
	if (elapsed < hold || !sceneReady) return false;
	// API warming continues in the background; model availability must not hide page content.
	return sceneReady;
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
