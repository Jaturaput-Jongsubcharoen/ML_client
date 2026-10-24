<div class="steering" aria-hidden="true">
	<svg viewBox="0 0 1400 1000" preserveAspectRatio="none">
		<path class="outer-rim" d="M-150 1000C-100 410 240 110 700 110S1500 410 1550 1000" />
		<path class="inner-rim" d="M-150 1000C-95 430 250 140 700 140S1495 430 1550 1000" />
	</svg>
</div>

<style>
	.steering {
		position: absolute;
		z-index: 0;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	svg {
		position: absolute;
		top: clamp(8.5rem, 10vw, 9rem);
		left: 50%;
		display: block;
		width: min(160%, 1600px);
		height: auto;
		overflow: visible;
		transform: translateX(-50%);
		filter: drop-shadow(0 8px 14px color-mix(in srgb, var(--color-text) 12%, transparent));
	}

	.outer-rim,
	.inner-rim {
		fill: none;
		vector-effect: non-scaling-stroke;
	}

	.outer-rim {
		stroke: color-mix(in srgb, var(--color-muted) 36%, transparent);
		stroke-width: 12px;
	}

	.inner-rim {
		stroke: color-mix(in srgb, var(--color-text) 24%, transparent);
		stroke-width: 2px;
	}

	@media (max-width: 650px) {
		svg {
			top: 72rem;
			width: min(130%, 600px);
		}
	}
</style>
