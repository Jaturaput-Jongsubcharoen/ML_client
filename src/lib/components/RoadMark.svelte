<svg
	class="road-mark"
	viewBox="0 0 40 40"
	role="img"
	aria-label="Collision Fatality Prediction mark"
>
	<!-- Every element maps onto another under a 90° turn about (20, 20): identical at 0/90/180/270°. -->
	<rect x="1" y="1" width="38" height="38" rx="8" fill="none" stroke="currentColor" />
	<path
		d="M8 15H15V8M25 8V15H32M32 25H25V32M15 32V25H8"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<path
		d="M18 9V14M31 18H26M22 31V26M9 22H14"
		fill="none"
		stroke="currentColor"
		stroke-width="1.4"
		stroke-linecap="round"
		opacity="0.6"
	/>
	<circle cx="20" cy="20" r="3.2" fill="var(--color-accent)" />
</svg>

<style>
	.road-mark {
		width: 2.35rem;
		height: 2.35rem;
		flex: 0 0 auto;
		color: var(--color-text);
	}
</style>
