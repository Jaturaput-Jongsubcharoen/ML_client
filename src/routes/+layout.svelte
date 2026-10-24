<script lang="ts">
	import '../lib/styles/global.css';
	import '../lib/styles/intro.css';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}
