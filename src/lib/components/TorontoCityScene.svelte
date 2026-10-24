<script lang="ts">
	import { onMount } from 'svelte';
	import type { Theme } from '../types';
	import type { CityController } from '../scene/city';

	let { theme, onSceneReady }: { theme: Theme; onSceneReady?: () => void } = $props();
	let canvas: HTMLCanvasElement;
	let sceneElement: HTMLDivElement;
	let controller = $state.raw<CityController | undefined>();
	let ready = $state(false);
	let reduced = $state(false);
	let failure = $state('');
	let sceneReported = false;

	// Signals the intro once the first frame is composited, or once 3D is known to be unavailable.
	function reportSceneReady(rendered: boolean) {
		if (sceneReported) return;
		sceneReported = true;
		if (rendered && sceneElement) sceneElement.dataset.firstFrame = 'true';
		onSceneReady?.();
	}

	$effect(() => {
		controller?.setTheme(theme);
	});

	onMount(() => {
		let disposed = false;
		let scrollFrame = 0;
		const initializationStarted = performance.now();
		const landing = document.querySelector<HTMLElement>('.hero');
		const stickyHeader = document.querySelector<HTMLElement>('.site-header');
		const updateOpacity = () => {
			scrollFrame = 0;
			if (!landing || !sceneElement) return;
			const landingTop = landing.getBoundingClientRect().top + window.scrollY;
			const landingTravel = Math.max(
				landingTop + landing.offsetHeight - (stickyHeader?.offsetHeight ?? 0),
				window.innerHeight
			);
			const landingProgress = window.scrollY / landingTravel;
			const fadeProgress = Math.max(0, Math.min(1, (landingProgress - 0.68) / 0.24));
			sceneElement.style.opacity = String(1 - fadeProgress * 0.75);
		};
		const requestOpacityUpdate = () => {
			if (!scrollFrame) scrollFrame = requestAnimationFrame(updateOpacity);
		};
		updateOpacity();
		window.addEventListener('scroll', requestOpacityUpdate, { passive: true });
		window.addEventListener('resize', requestOpacityUpdate, { passive: true });
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		const motion = () => {
			reduced = media.matches;
			controller?.setReducedMotion(reduced);
		};
		motion();
		media.addEventListener('change', motion);

		void import('../scene/city')
			.then(({ createCity }) => {
				if (disposed) return;
				controller = createCity(
					canvas,
					theme,
					(message) => {
						failure = message;
						reportSceneReady(false);
					},
					() => requestAnimationFrame(() => {
						if (!disposed) reportSceneReady(true);
					})
				);
				if (reduced) controller.setReducedMotion(true);
				sceneElement.dataset.initMs = (performance.now() - initializationStarted).toFixed(1);
				ready = true;
			})
			.catch((error: unknown) => {
				if (disposed) return;
				console.error('Unable to initialize the interactive city.', error);
				failure =
					'Interactive 3D is unavailable. The classifiers and historical map remain available.';
				reportSceneReady(false);
			});

		return () => {
			disposed = true;
			cancelAnimationFrame(scrollFrame);
			window.removeEventListener('scroll', requestOpacityUpdate);
			window.removeEventListener('resize', requestOpacityUpdate);
			media.removeEventListener('change', motion);
			controller?.dispose();
		};
	});
</script>

<div bind:this={sceneElement} class="city" data-ready={ready} data-motion={reduced ? 'reduced' : 'running'}>
	<canvas bind:this={canvas} aria-hidden="true" tabindex="-1"></canvas>
	{#if !ready || failure}
		<p class="sr-only" role="status">{failure || 'Preparing the interactive city illustration.'}</p>
	{/if}
</div>

<style>
	.city {
		position: fixed;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		background: var(--color-bg);
		opacity: 1;
		pointer-events: none;
		will-change: opacity;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

</style>
