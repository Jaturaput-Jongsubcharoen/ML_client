<script lang="ts">
	import { metricLabels, modelIds, modelMetrics, modelNames } from '../data/models';
	import type { ModelId } from '../types';
	import PerformanceGauge from './PerformanceGauge.svelte';
	import SteeringWheel from './SteeringWheel.svelte';

	let { selectedModel, onSelect, disabled, feedback }: {
		selectedModel: ModelId;
		onSelect: (model: ModelId) => void;
		disabled: boolean;
		feedback: { prediction: 0 | 1; sequence: number } | null;
	} = $props();
	const icons: Record<ModelId, string> = { random_forest: 'M6 19V7m6 12V3m6 16V9M3 9l3-3 3 3m0-4 3-3 3 3m0 6 3-3 3 3', knn: 'M4 4h4v4H4zm12 0h4v4h-4zM10 10h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z', svm: 'M4 20L20 4M4 6h3m10 12h3M5 12h2m10-1h2', neural_network: 'M4 5l8 7 8-7M4 19l8-7 8 7M4 5v14m16-14v14M12 3v18', logistic_regression: 'M3 20V4m0 16h18M5 17c7 0 6-11 14-11' };
	const metrics = Object.entries(metricLabels) as [keyof typeof metricLabels, string][];
</script>

<section class="cockpit-section" id="models" aria-labelledby="cockpit-heading">
	<div class="section-heading">
		<span class="eyebrow">02 / Model selection &amp; performance</span>
		<h2 id="cockpit-heading">Choose your perspective.</h2>
		<p>Five trained classifiers. One historical outcome. Switch models to compare their reported performance before configuring a record.</p>
	</div>
	<div class="cockpit" class:fatal={feedback?.prediction === 1} class:nonfatal={feedback?.prediction === 0}>
		<div class="cockpit-top"><span>TOR / Research instruments</span><span>Supervised learning / 05 modes</span></div>
		<SteeringWheel />
		<div class="model-selector" role="group" aria-label="Select a machine learning model">
			{#each modelIds as model, index (model)}
				<div class="model-mode" class:active={selectedModel === model}>
					<button type="button" class="mode-button" aria-pressed={selectedModel === model}
						aria-label={`Select ${modelNames[model]}`} {disabled} onclick={() => onSelect(model)}>
						<span class="mode-number">0{index + 1}</span>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d={icons[model]} /></svg>
						<strong>{modelNames[model]}</strong>
						<span class="mode-state">{selectedModel === model ? 'Selected' : 'Select model'}</span>
					</button>
					<details><summary aria-label={`Information about ${modelNames[model]}`}>Info <span aria-hidden="true">+</span></summary><p>{modelMetrics[model].description}</p></details>
				</div>
			{/each}
		</div>
		<div class="instrument-deck">
			<div class="performance">
				<div class="instrument-title" aria-live="polite"><h3>{modelNames[selectedModel]}</h3><span>Historical evaluation / %</span></div>
				<div class="gauges">
					{#each metrics as [key, label] (key)}
						<PerformanceGauge {label} value={modelMetrics[selectedModel][key]} />
					{/each}
				</div>
				<p class="metric-note">Reported values from the original interface and the later block in <code>Models_Performance.txt</code>. The file contains a conflicting earlier run. These are not prediction confidence scores.</p>
			</div>
		</div>
		{#if feedback}
			{#key feedback.sequence}
				<div class="cockpit-response" aria-hidden="true"></div>
			{/key}
		{/if}
		<div class="cockpit-bottom"><span>Selected / {modelNames[selectedModel]}</span><a href="#customize">Configure collision conditions <span aria-hidden="true">↓</span></a></div>
	</div>
</section>

<style>
	.cockpit-section {
		padding-block: clamp(4rem, 8vw, 7rem);
	}

	.cockpit {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border: 1px solid var(--color-border);
		border-radius: 2rem 2rem 0.4rem 0.4rem;
		background: color-mix(in srgb, var(--color-surface) 82%, transparent);
		box-shadow: var(--shadow-card);
		backdrop-filter: blur(8px);
	}

	.cockpit-top,
	.cockpit-bottom {
		position: relative;
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 1rem;
		padding: 1.1rem 1.5rem;
		color: var(--color-muted);
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.cockpit-top {
		border-bottom: 1px solid var(--color-border);
	}

	.model-selector {
		position: relative;
		z-index: 2;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 0.55rem;
		padding: 1.2rem;
	}

	.model-mode {
		min-width: 0;
		border: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.model-mode.active {
		border-color: var(--color-accent);
		box-shadow: inset 0 2px var(--color-accent);
	}

	.mode-button {
		display: grid;
		width: 100%;
		min-height: 152px;
		grid-template-columns: 1fr auto;
		align-content: start;
		padding: 0.8rem;
		border: 0;
		background: none;
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
		transition: background 180ms ease;
	}

	.mode-button:hover {
		background: var(--color-surface-raised);
	}

	.mode-button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.mode-number {
		color: var(--color-muted);
		font: 0.65rem monospace;
	}

	.mode-button svg {
		width: 23px;
		height: 23px;
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 1.1;
	}

	.mode-button strong {
		grid-column: 1 / -1;
		min-height: 2.6em;
		margin-top: 1.2rem;
		font-size: 0.82rem;
		font-weight: 550;
	}

	.mode-state {
		grid-column: 1 / -1;
		margin-top: 0.5rem;
		color: var(--color-muted);
		font-size: 0.61rem;
	}

	.active .mode-state {
		color: var(--color-accent);
	}

	details {
		padding: 0 0.8rem;
		border-top: 1px solid var(--color-border);
	}

	summary {
		min-height: 44px;
		padding-block: 0.65rem;
		font-size: 0.7rem;
		cursor: pointer;
	}

	summary span {
		float: right;
		color: var(--color-accent);
	}

	details p {
		color: var(--color-muted);
		font-size: 0.72rem;
	}

	.instrument-deck {
		position: relative;
		z-index: 1;
		display: grid;
		padding: clamp(1.5rem, 3vw, 2.5rem) clamp(1rem, 3vw, 2rem) 5rem;
	}

	.performance {
		position: relative;
		z-index: 1;
	}

	.instrument-title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.instrument-title h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
	}

	.instrument-title span {
		color: var(--color-muted);
		font-size: 0.62rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.gauges {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.8rem;
		margin-top: 1.4rem;
	}

	.metric-note {
		position: relative;
		z-index: 1;
		max-width: 640px;
		color: var(--color-muted);
		font-size: 0.67rem;
		line-height: 1.7;
	}

	.cockpit-bottom {
		border-top: 1px solid var(--color-border);
	}

	.cockpit-bottom a {
		color: var(--color-text);
		text-decoration: none;
	}

	.cockpit-response {
		position: absolute;
		z-index: 0;
		inset: 0;
		pointer-events: none;
		animation: instrument-pulse 1900ms ease-out both;
	}

	.fatal .cockpit-response {
		background: #8f4a3e;
	}

	.nonfatal .cockpit-response {
		background: #788b75;
	}

	.cockpit.fatal {
		animation: instrument-impact 450ms ease-out;
	}

	.cockpit.nonfatal :global(.arc) {
		animation: gauge-settle 1800ms ease-out;
	}

	@keyframes instrument-impact {
		0%,
		100% {
			transform: translateX(0);
		}
		35% {
			transform: translateX(2px);
		}
		65% {
			transform: translateX(-1px);
		}
	}

	@keyframes gauge-settle {
		0%,
		100% {
			stroke: var(--color-accent);
		}
		25% {
			stroke: var(--color-success);
		}
	}

	@keyframes instrument-pulse {
		0%,
		100% {
			opacity: 0;
		}
		18% {
			opacity: 0.2;
		}
	}

	@media (max-width: 760px) {
		.gauges {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 0.5rem;
			max-width: 540px;
			margin-inline: auto;
		}
	}

	@media (max-width: 650px) {
		.model-selector {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			padding: 0.7rem;
		}

		.model-mode:last-child {
			grid-column: 1 / -1;
		}

		.mode-button {
			min-height: 125px;
		}

		.mode-button strong {
			margin-top: 0.6rem;
		}

		.instrument-deck {
			padding: 1.25rem 0.85rem 4rem;
		}

		.cockpit-top,
		.cockpit-bottom {
			padding: 1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cockpit.fatal,
		.cockpit.nonfatal :global(.arc) {
			animation: none;
		}

		.cockpit-response {
			display: none;
		}
	}
</style>
