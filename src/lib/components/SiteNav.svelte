<script lang="ts">
	import RoadMark from './RoadMark.svelte';
	import type { Theme } from '../types';

	let {
		theme,
		onThemeToggle
	}: {
		theme: Theme;
		onThemeToggle: (button: HTMLButtonElement) => void;
	} = $props();

	let menuOpen = $state(false);

</script>

<header class="site-header">
	<div class="nav-inner container">
		<a class="brand" href="#top" aria-label="Collision Fatality Prediction home" onclick={() => (menuOpen = false)}>
			<RoadMark />
			<span>
				<strong>Collision Fatality</strong>
				<small>Prediction / Toronto</small>
			</span>
		</a>

		<button
			class="menu-toggle"
			type="button"
			aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
			aria-expanded={menuOpen}
			aria-controls="primary-navigation"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span>
			<span></span>
		</button>

		<nav id="primary-navigation" class:open={menuOpen} aria-label="Main navigation">
			<a href="#models" onclick={() => (menuOpen = false)}>Model cockpit</a>
			<a href="#prediction" onclick={() => (menuOpen = false)}>Predict</a>
			<a href="#customize" onclick={() => (menuOpen = false)}>Conditions</a>
			<a href="#toronto-map" onclick={() => (menuOpen = false)}>Toronto map</a>
			<a href="#about" onclick={() => (menuOpen = false)}>About the models</a>
			<button
				class="theme-toggle"
				type="button"
				aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
				onclick={(event) => onThemeToggle(event.currentTarget)}
			>
				{#if theme === 'dark'}
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<circle cx="12" cy="12" r="4"></circle>
						<path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.6 8.6 0 1 0 20.5 15.3Z"></path>
					</svg>
				{/if}
				<span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
			</button>
		</nav>
	</div>
</header>

<style>
	.site-header {
		position: sticky;
		z-index: 20;
		top: 0;
		border-bottom: 1px solid var(--color-border);
		background: linear-gradient(
			to bottom,
			color-mix(in srgb, var(--color-bg) 100%, transparent) 0%,
			color-mix(in srgb, var(--color-bg) 62%, transparent) 52%,
			transparent 100%
		);
	}

	.nav-inner,
	.brand,
	nav {
		display: flex;
		align-items: center;
	}

	.nav-inner {
		min-height: 4.7rem;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.brand {
		gap: 0.75rem;
		text-decoration: none;
	}

	.brand span {
		display: grid;
		line-height: 1.18;
	}

	.brand strong {
		font-size: 0.82rem;
		letter-spacing: 0.02em;
	}

	.brand small {
		margin-top: 0.22rem;
		color: var(--color-muted);
		font-size: 0.65rem;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}

	nav {
		gap: clamp(0.8rem, 2vw, 1.6rem);
	}

	nav a {
		color: var(--color-muted);
		font-size: 0.78rem;
		text-decoration: none;
		transition: color 160ms ease;
	}

	nav a:hover {
		color: var(--color-text);
	}

	.theme-toggle,
	.menu-toggle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.theme-toggle {
		min-height: 2.45rem;
		gap: 0.55rem;
		padding: 0.4rem 0.65rem;
		border-radius: 0.3rem;
		font-size: 0.74rem;
	}

	.theme-toggle svg {
		width: 1rem;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.menu-toggle {
		display: none;
		width: 2.8rem;
		height: 2.8rem;
		flex-direction: column;
		gap: 0.35rem;
		border-radius: 0.3rem;
	}

	.menu-toggle span {
		width: 1.1rem;
		height: 1px;
		background: currentColor;
	}

	@media (max-width: 1000px) {
		.nav-inner {
			position: relative;
		}

		.menu-toggle {
			display: flex;
		}

		nav {
			position: absolute;
			top: calc(100% + 1px);
			right: 0;
			left: 0;
			display: none;
			align-items: stretch;
			padding: 0.75rem 1rem 1rem;
			border: 1px solid var(--color-border);
			border-top: 0;
			background: var(--color-bg);
		}

		nav.open {
			display: flex;
			flex-direction: column;
		}

		nav a {
			padding: 0.55rem 0.15rem;
		}

		.theme-toggle {
			align-self: flex-start;
			margin-top: 0.35rem;
		}
	}
</style>
