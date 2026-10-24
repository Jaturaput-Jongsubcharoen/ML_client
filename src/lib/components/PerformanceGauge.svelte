<script lang="ts">
	let { label, value }: { label: string; value: number } = $props();
	const ticks = Array.from({ length: 41 }, (_, index) => index);
</script>

<div class="gauge" aria-label={`${label}: ${(value * 100).toFixed(2)}%`} data-metric={label}>
	<svg viewBox="0 0 200 178" aria-hidden="true">
		<path class="bezel" d="M 29 151 A 88 88 0 1 1 171 151" />
		<path class="track" pathLength="100" d="M 37 145 A 78 78 0 1 1 163 145" />
		<path class="arc" pathLength="100" stroke-dasharray={`${value * 100} 100`} d="M 37 145 A 78 78 0 1 1 163 145" />
		{#each ticks as tick (tick)}
			<line x1="100" y1="27" x2="100" y2={tick % 5 ? 30 : 34}
				transform={`rotate(${-130 + tick * 6.5} 100 100)`} class:major={tick % 5 === 0} />
		{/each}
		<g class="needle" style={`transform: rotate(${-130 + value * 260}deg)`}>
			<path d="M 99 54 L 101 54 L 102 68 L 98 68 Z" />
		</g>
		<text class="minimum" x="34" y="168">0</text>
		<text class="maximum" x="157" y="168">100</text>
	</svg>
	<div class="reading"><strong>{(value * 100).toFixed(2)}<small>%</small></strong><span>{label}</span></div>
</div>

<style>
	.gauge { position: relative; min-width: 0; aspect-ratio: 200 / 178; font-variant-numeric: tabular-nums; }
	svg { width: 100%; height: 100%; overflow: visible; }
	path { fill: none; }
	.bezel { stroke: var(--color-border); stroke-width: 1.5; }
	.track { stroke: var(--color-surface-raised); stroke-width: 4; }
	.arc { stroke: var(--color-accent); stroke-width: 4; transition: stroke-dasharray 650ms cubic-bezier(0.2, 0.7, 0.3, 1); }
	line { stroke: var(--color-muted); stroke-width: 0.65; }
	line.major { stroke: var(--color-text); stroke-width: 1; }
	.needle { transform-origin: 100px 100px; transition: transform 650ms cubic-bezier(0.2, 0.7, 0.3, 1); }
	.needle path { fill: var(--color-accent); }
	text { fill: var(--color-muted); font-size: 8px; }
	.reading { position: absolute; inset: 42% 0 auto; text-align: center; }
	strong { font-size: clamp(1.25rem, 2.3vw, 2.15rem); line-height: 1.2; font-weight: 500; letter-spacing: -0.06em; }
	small { margin-left: 0.2rem; font-size: 0.62rem; color: var(--color-muted); letter-spacing: 0; }
	.reading span { display: block; margin-top: 0.35rem; color: var(--color-muted); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.12em; }
</style>
