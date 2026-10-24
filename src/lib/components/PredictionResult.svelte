<script lang="ts">
	import { modelNames } from '../data/models';
	import type { PredictionResponse } from '../types';
	let { result, onDismiss, onAnother }: { result: PredictionResponse; onDismiss: () => void; onAnother: () => void } = $props();
</script>

<div class="result-panel" class:fatal={result.prediction === 1} class:nonfatal={result.prediction === 0} data-outcome={result.prediction}>
	<div class="feedback" aria-hidden="true">
		{#if result.prediction === 1}
			<svg class="fracture" viewBox="0 0 800 300" preserveAspectRatio="none"><path d="M430 120L370 75L335 12M370 75L290 90L230 40M430 120L485 80L510 0M485 80L610 62M430 120L480 180L600 230L650 300M480 180L465 280M430 120L360 175L250 205L200 300M360 175L350 250M430 120L565 125L700 160" /></svg>
		{:else}
			<span class="wave"></span>
		{/if}
	</div>
	<div class="result-copy" role="status" aria-live="polite" aria-atomic="true">
		<span class="eyebrow">Classification returned / {modelNames[result.model]}</span>
		<h3>{result.prediction === 1 ? 'Fatal collision classification' : 'Non-fatal collision classification'}</h3>
		<p>Binary label <strong>{result.prediction}</strong>. {result.prediction === 1 ? 'The model classified these submitted conditions in the fatal class.' : 'The model classified these submitted conditions in the non-fatal class. Non-fatal does not mean that no collision occurred.'}</p>
		<p>No probability was returned. This historical classifier does not guarantee a future outcome.</p>
	</div>
	<div class="result-actions">
		<button type="button" class="button" onclick={onAnother}>Make another prediction</button>
		<button type="button" class="dismiss" onclick={onDismiss}>Dismiss result</button>
	</div>
</div>

<style>
	.result-panel { position: relative; isolation: isolate; overflow: hidden; margin-top: 1.6rem; padding: clamp(1rem, 3vw, 2rem); border: 1px solid var(--result-color); background: var(--color-surface); --result-color: var(--color-success); }
	.result-panel.fatal { --result-color: var(--color-danger); animation: impact 450ms ease-out; }
	.result-copy { position: relative; }
	.eyebrow { color: var(--result-color); }
	h3 { margin: 0.8rem 0; font-size: clamp(1.4rem,3vw,2rem); font-weight: 500; letter-spacing: -0.04em; }
	p { font-size: 0.83rem; color: var(--color-muted); max-width: 680px; }
	.result-actions { display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-top: 1.3rem; }
	.dismiss { background: none; border: 0; color: var(--color-muted); cursor: pointer; min-height: 44px; text-decoration: underline; font-size: 0.8rem; }
	.feedback { position: absolute; inset: 0; pointer-events: none; z-index: -1; background: color-mix(in srgb, var(--result-color) 20%, transparent); animation: fade-feedback 2100ms ease-out both; }
	.fracture { width: 100%; height: 100%; stroke: var(--result-color); stroke-width: 0.7; fill: none; opacity: 0.55; }
	.wave { position: absolute; width: 220px; height: 220px; border: 1px solid var(--result-color); border-radius: 50%; top: 50%; left: 50%; animation: stabilize 1800ms ease-out both; }
	@keyframes fade-feedback { 0% { opacity: 0; } 18% { opacity: 0.75; } 100% { opacity: 0; } }
	@keyframes stabilize { from { transform: translate(-50%,-50%) scale(0.2); } to { transform: translate(-50%,-50%) scale(4); } }
	@keyframes impact { 0%,100% { transform: translateX(0); } 35% { transform: translateX(2px); } 65% { transform: translateX(-1px); } }
	@media(prefers-reduced-motion: reduce) { .feedback { display: none; } .result-panel.fatal { animation: none; } }
</style>
