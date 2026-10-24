<script lang="ts">
	import { onMount } from 'svelte';
	import { checkApiHealth } from '../services/apiHealth';
	import { INTRO_TIMING, introPlacement, shouldReleaseIntro } from '../intro/introTiming';

	let { sceneReady }: { sceneReady: boolean } = $props();
	let visible = $state(true);
	let releaseRequested = false;
	let releaseCheck: () => void = () => {};

	$effect(() => {
		if (sceneReady) releaseCheck();
	});

	onMount(() => {
		const root = document.documentElement;
		// The inline script in app.html starts the intro before hydration; without it, stay out of the way.
		if (root.dataset.intro !== 'loading') {
			visible = false;
			return;
		}
		root.dataset.introOwner = 'app';

		const brand = document.querySelector<HTMLElement>('.site-header .brand');
		const logo = brand?.querySelector<SVGElement>('.road-mark');
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let apiSettled = false;
		let shownAt: number | undefined;
		let disposed = false;
		let pollTimer = 0;
		const timers: number[] = [];

		const place = () => {
			if (!brand || root.dataset.intro !== 'loading') return;
			const inlineTransform = brand.style.transform;
			brand.style.transform = 'none';
			const bounds = brand.getBoundingClientRect();
			brand.style.transform = inlineTransform;
			if (!bounds.width || !bounds.height) return;
			const { dx, dy, scale } = introPlacement(bounds, {
				width: root.clientWidth,
				height: window.innerHeight
			});
			root.style.setProperty('--intro-dx', `${dx.toFixed(1)}px`);
			root.style.setProperty('--intro-dy', `${dy.toFixed(1)}px`);
			root.style.setProperty('--intro-scale', scale.toFixed(3));
		};

		const wait = (ms: number) =>
			new Promise<void>((resolve) => timers.push(window.setTimeout(resolve, ms)));

		const finish = () => {
			delete root.dataset.intro;
			delete root.dataset.introPlaced;
			root.style.removeProperty('--intro-dx');
			root.style.removeProperty('--intro-dy');
			root.style.removeProperty('--intro-scale');
			visible = false;
		};

		const release = async () => {
			if (releaseRequested || disposed) return;
			releaseRequested = true;
			window.clearTimeout(pollTimer);
			if (!apiSettled) root.dataset.apiStatus = 'waking';
			// Finish the current quarter turn (never start a new one) so the symmetric mark lands upright.
			const angle = logo ? Number.parseFloat(getComputedStyle(logo).rotate) || 0 : 0;
			root.dataset.intro = 'moving';
			if (!reduced && logo && angle > 0.5 && angle < 89.5 && typeof logo.animate === 'function') {
				logo.animate([{ rotate: `${angle}deg` }, { rotate: '90deg' }], {
					duration: Math.max(120, ((90 - angle) / 90) * 375),
					easing: 'cubic-bezier(0.22, 0.8, 0.3, 1)'
				});
			}
			await wait(reduced ? INTRO_TIMING.reducedMoveMs : INTRO_TIMING.moveMs);
			if (disposed) return;
			root.dataset.intro = 'revealing';
			await wait(reduced ? INTRO_TIMING.reducedRevealMs : INTRO_TIMING.revealMs);
			if (!disposed) finish();
		};

		const check = () => {
			if (releaseRequested || disposed) return;
			const now = performance.now();
			// The centred hold counts from when the brand appears; the hard timeout counts from navigation.
			const ready =
				now >= INTRO_TIMING.timeoutMs ||
				(shownAt !== undefined &&
					shouldReleaseIntro({ elapsed: now - shownAt, sceneReady, apiSettled, reduced }));
			if (ready) void release();
		};
		releaseCheck = check;

		const poll = () => {
			check();
			if (!releaseRequested && !disposed) pollTimer = window.setTimeout(poll, 120);
		};

		place();
		window.addEventListener('resize', place, { passive: true });
		// Measure once fonts settle (or after a short cap), then reveal the brand at that fixed size.
		const showBrand = () => {
			if (disposed || root.dataset.introPlaced !== undefined) return;
			place();
			root.dataset.introPlaced = '';
			shownAt = performance.now();
		};
		timers.push(window.setTimeout(showBrand, 400));
		void document.fonts?.ready.then(showBrand);
		if (!document.fonts) showBrand();
		void checkApiHealth().then((status) => {
			apiSettled = true;
			if (!disposed) root.dataset.apiStatus = status;
			check();
		});
		poll();

		return () => {
			disposed = true;
			window.clearTimeout(pollTimer);
			timers.forEach((timer) => window.clearTimeout(timer));
			window.removeEventListener('resize', place);
			if (root.dataset.intro) finish();
		};
	});
</script>

{#if visible}
	<div class="intro-overlay">
		<p class="sr-only" role="status">Loading Collision Fatality Prediction / Toronto / Canada.</p>
	</div>
{/if}
