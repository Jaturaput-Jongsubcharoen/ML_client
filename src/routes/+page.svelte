<script lang="ts">
	import { onMount } from 'svelte';
	import TorontoCityScene from '../lib/components/TorontoCityScene.svelte';
	import IntroOverlay from '../lib/components/IntroOverlay.svelte';
	import ModelCockpit from '../lib/components/ModelCockpit.svelte';
	import PredictionWorkspace from '../lib/components/PredictionWorkspace.svelte';
	import RoadMark from '../lib/components/RoadMark.svelte';
	import SiteNav from '../lib/components/SiteNav.svelte';
	import TorontoMap from '../lib/components/TorontoMap.svelte';
	import type { Theme, ModelId, PredictionResponse } from '../lib/types';

	let selectedModel = $state<ModelId>('random_forest');
	let isLoading = $state(false);
	let feedback = $state<{ prediction: 0 | 1; sequence: number } | null>(null);
	let sequence = 0;
	function onResult(result: PredictionResponse | null) {
		feedback = result ? { prediction: result.prediction, sequence: ++sequence } : null;
	}
	let theme = $state<Theme>('dark');
	let isTransitioning = $state(false);
	let sceneReady = $state(false);
	onMount(() => {
		const savedTheme = document.documentElement.dataset.theme;
		theme = savedTheme === 'light' ? 'light' : 'dark';
	});

	function persistTheme(value: Theme) {
		try {
			localStorage.setItem('collision-theme', value);
		} catch (error) {
			console.error('Unable to save the theme preference.', error);
		}
	}

	async function toggleTheme(button: HTMLButtonElement) {
		if (isTransitioning) return;
		isTransitioning = true;

		const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
		const root = document.documentElement;
		const bounds = button.getBoundingClientRect();
		root.style.setProperty('--theme-x', `${bounds.left + bounds.width / 2}px`);
		root.style.setProperty('--theme-y', `${bounds.top + bounds.height / 2}px`);

		const applyTheme = () => {
			root.dataset.theme = nextTheme;
			theme = nextTheme;
			persistTheme(nextTheme);
		};

		try {
			const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (!prefersReducedMotion && 'startViewTransition' in document) {
				const transition = document.startViewTransition(applyTheme);
				await transition.finished;
			} else if (prefersReducedMotion) {
				applyTheme();
			} else {
				document.body.classList.add('theme-switching');
				applyTheme();
				await new Promise((resolve) => window.setTimeout(resolve, 430));
				document.body.classList.remove('theme-switching');
			}
		} catch (error) {
			console.error('Theme reveal failed; applying the selected theme without animation.', error);
			applyTheme();
			document.body.classList.remove('theme-switching');
		} finally {
			isTransitioning = false;
		}
	}
</script>

<svelte:head>
	<title>Collision Fatality Prediction / Toronto / Canada</title>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<meta
		name="description"
		content="Explore historical Toronto collision fatality classifications using five supervised machine learning models."
	/>
</svelte:head>

<div class="page-shell">
	<TorontoCityScene {theme} onSceneReady={() => (sceneReady = true)} />
	<IntroOverlay {sceneReady} />
	<a class="skip-link" href="#main-content">Skip to main content</a>
	<SiteNav {theme} onThemeToggle={toggleTheme} />

<main id="main-content">
	<section class="hero" id="top" aria-labelledby="hero-heading">
		<div class="hero-copy">
			<span class="eyebrow">Toronto / Transportation research</span>
			<h1 id="hero-heading">A city of conditions.<br />A question of <em>outcomes.</em></h1>
			<p class="hero-lede">
				Collision Fatality Prediction. Explore five supervised learning perspectives on historical Toronto collision records.
			</p>
			<p class="hero-author">By Jaturaput (Mac) Jongsubcharoen</p>
			<a class="button button-primary hero-cta" href="#models">
				Enter the model cockpit <span aria-hidden="true">↘</span>
			</a>
			<p class="hero-caveat">An educational study. Not a live accident detector or safety forecast.</p>
		</div>
	</section>

	<div class="container">
		<ModelCockpit {selectedModel} onSelect={(model) => selectedModel = model} disabled={isLoading} {feedback} />
		<PredictionWorkspace {selectedModel} bind:isLoading {onResult} />
		<TorontoMap {theme} />

		<section class="about-section" id="about" aria-labelledby="about-heading">
			<div class="section-heading">
				<span class="eyebrow">06 / About the models &amp; architecture</span>
				<h2 id="about-heading">What This App Does</h2>
				<p>
					This application uses five supervised machine learning models trained on historical Toronto
					collision data to classify fatal and non-fatal outcomes based on road, driver, and environmental
					conditions. Users can compare model performance and generate predictions through a web interface
					connected to a Flask REST API.
				</p>
			</div>

			<ol class="workflow" aria-label="Supervised learning workflow">
				<li><span>01 →</span><strong>Historical Toronto dataset</strong><small>Records with known outcomes</small></li>
				<li><span>02 →</span><strong>Data preprocessing</strong><small>Encoded categories + coordinates</small></li>
				<li><span>03 →</span><strong>Supervised model training</strong><small>Offline training and evaluation</small></li>
				<li><span>04 →</span><strong>Saved ML models</strong><small>Model + expected feature list</small></li>
				<li><span>05 →</span><strong>Flask REST API</strong><small>POST /predict</small></li>
				<li><span>06 →</span><strong>SvelteKit frontend</strong><small>Conditions in, model response out</small></li>
				<li><span>07</span><strong>Classification result</strong><small>Fatal (1) or non-fatal (0)</small></li>
			</ol>
			<p class="training-note">Training happens separately from live prediction requests. The 3D city is an artistic illustration; the historical map below the prediction workspace is a distinct, data-backed view.</p>

			<div class="about-note">
				<div>
					<span class="eyebrow">Target label</span>
					<h3><code>ACCLASS</code></h3>
					<p>
						The training code maps <code>Fatal</code> to <code>1</code> and other collision
						classifications to <code>0</code>. A live API response contains the selected model and that
						binary label; it does not include a confidence score.
					</p>
				</div>
				<div>
					<span class="eyebrow">Limitations</span>
					<h3>Context matters.</h3>
					<p>
						The data is historical and the model input includes recorded injury severity, which is
						related to the target. This interface is for learning and should not inform safety,
						insurance, enforcement, or operational decisions.
					</p>
				</div>
			</div>
		</section>
	</div>
</main>

<footer class="site-footer">
	<div class="container footer-inner">
		<a class="footer-brand" href="#top" aria-label="Back to top">
			<RoadMark />
			<span>Collision Fatality Prediction</span>
		</a>
		<p>Historical data. Model classifications. No live traffic inference.</p>
		<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
			Map data © OpenStreetMap contributors
		</a>
	</div>
</footer>
</div>

<style>
	.page-shell {
		position: relative;
		isolation: isolate;
		min-height: 100vh;
	}

	main,
	.site-footer {
		position: relative;
		z-index: 1;
	}

	.hero {
		touch-action: pan-y pinch-zoom;
		position: relative;
		height: calc(100svh - 4.7rem);
		min-height: 650px;
		isolation: isolate;
		overflow: hidden;
	}

	.hero-copy {
		position: absolute;
		top: clamp(1.5rem, 5vh, 4rem);
		left: max(1.5rem, calc((100% - 1320px) / 2));
		max-width: 470px;
		padding: 1.3rem;
		background: linear-gradient(110deg, color-mix(in srgb, var(--color-bg) 96%, transparent), color-mix(in srgb, var(--color-bg) 60%, transparent));
		pointer-events: none;
	}
	.hero-copy a { pointer-events: auto; }

	h1 {
		margin: 0.9rem 0 1rem;
		font-size: clamp(1.8rem, 3.2vw, 3rem);
		font-weight: 500;
		letter-spacing: -0.055em;
		line-height: 1.08;
	}

	h1 em {
		color: var(--color-accent);
		font-weight: 500;
	}

	.hero-lede {
		max-width: 510px;
		margin: 0;
		color: var(--color-text);
		font-size: 0.88rem;
		line-height: 1.55;
	}

	.hero-author {
		margin: 0.6rem 0 0;
		color: var(--color-muted);
		font-size: 0.74rem;
		letter-spacing: 0.02em;
	}

	.hero-caveat {
		max-width: 490px;
		margin: 1rem 0 0;
		color: var(--color-muted);
		font-size: 0.68rem;
	}

	.hero-cta {
		margin-top: 1.1rem;
		font-size: 0.8rem;
	}

	.training-note { color: var(--color-muted); font-size: 0.8rem; margin: 1.5rem 0; }

	.about-section {
		padding-block: clamp(4.5rem, 9vw, 8.5rem);
		border-top: 1px solid var(--color-border);
	}

	.workflow {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		margin: 0;
		padding: 1px;
		background: var(--color-border);
		list-style: none;
	}

	.workflow li {
		display: grid;
		min-height: 132px;
		align-content: start;
		gap: 0.55rem;
		padding: 1rem;
		background: var(--color-bg);
	}

	.workflow li > span {
		color: var(--color-accent);
		font-size: 0.65rem;
		font-weight: 750;
	}

	.workflow strong {
		font-size: 0.85rem;
	}

	.workflow small {
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.about-note {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
	}

	.about-note > div {
		padding: 1.4rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.about-note h3 {
		margin: 0.65rem 0 0.45rem;
		font-size: 1.15rem;
	}

	.about-note p {
		max-width: 520px;
		margin: 0;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	code {
		color: var(--color-text);
	}

	.site-footer {
		border-top: 1px solid var(--color-border);
	}

	.footer-inner,
	.footer-brand {
		display: flex;
		align-items: center;
	}

	.footer-inner {
		min-height: 5rem;
		justify-content: space-between;
		gap: 1rem;
		padding-block: 1rem;
	}

	.footer-brand {
		gap: 0.55rem;
		font-size: 0.72rem;
		font-weight: 650;
		text-decoration: none;
	}

	.footer-brand :global(.road-mark) {
		width: 1.6rem;
		height: 1.6rem;
	}

	.footer-inner p,
	.footer-inner > a:last-child {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.66rem;
	}

	@media (max-width: 620px) {
		.hero { min-height: 740px; }
		.hero-copy { top: 1rem; left: 1rem; right: 1rem; max-width: 400px; padding: 0.85rem; }
		h1 { font-size: clamp(1.7rem, 7vw, 2.3rem); }

		.workflow {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.about-note {
			grid-template-columns: minmax(0, 1fr);
		}

		.footer-inner {
			align-items: flex-start;
			flex-direction: column;
			justify-content: center;
			padding-block: 1.2rem;
		}
	}

	@media (max-width: 390px) {
		.workflow {
			grid-template-columns: minmax(0, 1fr);
		}

	}
</style>
