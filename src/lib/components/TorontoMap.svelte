<script lang="ts">
	import { onMount } from 'svelte';
	import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
	import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
	import type { Theme } from '../types';

	let { theme }: { theme: Theme } = $props();

	interface CollisionMapData {
		sourceFile: string;
		aggregation: string;
		metadata: {
			sourceRows: number;
			rowsWithCoordinates: number;
			rowsWithoutCollisionId: number;
			geolocatedCollisionCount: number;
			fatalCollisionCount: number;
			cellCount: number;
			gridDegrees: number;
		};
		collection: {
			type: 'FeatureCollection';
			features: Array<{
				type: 'Feature';
				geometry: { type: 'Point'; coordinates: [number, number] };
				properties: { collisionCount: number; fatalCount: number };
			}>;
		};
	}

	let mapElement: HTMLDivElement;
	let map: MapLibreMap | undefined;
	let mapError = $state('');
	let mapStatus = $state('Map data will load as you approach this section.');
	let summary = $state<CollisionMapData['metadata'] | null>(null);

	function applyMapTheme(activeTheme: Theme) {
		if (!map) return;
		const dark = activeTheme === 'dark';
		map.setPaintProperty('openstreetmap', 'raster-saturation', dark ? -0.72 : 0);
		map.setPaintProperty('openstreetmap', 'raster-brightness-max', dark ? 0.55 : 1);
	}

	$effect(() => {
		applyMapTheme(theme);
	});

	onMount(() => {
		let disposed = false;

		async function initializeMap() {
			try {
				const response = await fetch('/data/toronto-collision-density.json');
				if (!response.ok) {
					throw new Error(`Map data request failed with HTTP ${response.status}.`);
				}

				const data = (await response.json()) as CollisionMapData;
				if (
					!data.collection ||
					data.collection.type !== 'FeatureCollection' ||
					!Array.isArray(data.collection.features) ||
					!data.metadata
				) {
					throw new Error('The bundled map data does not match its expected format.');
				}
				if (disposed) return;
				summary = data.metadata;

				const maplibre = await import('maplibre-gl');
				if (disposed) return;
				maplibre.setWorkerUrl(mapWorkerUrl);

				map = new maplibre.Map({
					container: mapElement,
					style: {
						version: 8,
						sources: {
							openstreetmap: {
								type: 'raster',
								tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
								tileSize: 256,
								attribution:
									'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
							}
						},
						layers: [
							{
								id: 'openstreetmap',
								type: 'raster',
								source: 'openstreetmap',
								minzoom: 0,
								maxzoom: 19
							}
						]
					},
					center: [-79.3832, 43.6532],
					zoom: 10.2,
					minZoom: 8,
					maxZoom: 17,
					cooperativeGestures: true
				});

				map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
				map.on('load', () => {
					if (!map) return;
					map.addSource('collision-density', {
						type: 'geojson',
						data: data.collection,
						cluster: true,
						clusterRadius: 48,
						clusterMaxZoom: 13,
						clusterProperties: {
							collisionCount: ['+', ['get', 'collisionCount']],
							fatalCount: ['+', ['get', 'fatalCount']]
						}
					});

					map.addLayer({
						id: 'collision-clusters',
						type: 'circle',
						source: 'collision-density',
						filter: ['has', 'point_count'],
						paint: {
							'circle-color': '#a94e3d',
							'circle-opacity': 0.86,
							'circle-radius': [
								'interpolate',
								['linear'],
								['get', 'collisionCount'],
								1,
								12,
								80,
								29,
								500,
								42
							],
							'circle-stroke-color': '#f3f2ee',
							'circle-stroke-width': 1.5
						}
					});

					map.addLayer({
						id: 'collision-cluster-labels',
						type: 'symbol',
						source: 'collision-density',
						filter: ['has', 'point_count'],
						layout: {
							'text-field': ['to-string', ['get', 'collisionCount']],
							'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
							'text-size': 11
						},
						paint: { 'text-color': '#ffffff' }
					});

					map.addLayer({
						id: 'collision-cells',
						type: 'circle',
						source: 'collision-density',
						filter: ['!', ['has', 'point_count']],
						paint: {
							'circle-color': [
								'case',
								['>', ['get', 'fatalCount'], 0],
								'#a94e3d',
								'#647b7b'
							],
							'circle-opacity': 0.8,
							'circle-radius': [
								'interpolate',
								['linear'],
								['get', 'collisionCount'],
								1,
								4,
								15,
								9,
								75,
								15
							],
							'circle-stroke-color': '#ffffff',
							'circle-stroke-width': 1
						}
					});
					applyMapTheme(theme);

					map.on('click', 'collision-clusters', (event) => {
						const feature = event.features?.[0];
						const clusterId = feature?.properties?.cluster_id;
						const source = map?.getSource('collision-density') as GeoJSONSource | undefined;
						if (
							typeof clusterId !== 'number' ||
							!source ||
							!map ||
							!feature ||
							feature.geometry.type !== 'Point'
						) {
							return;
						}
						void source
							.getClusterExpansionZoom(clusterId)
							.then((zoom) => {
								map?.easeTo({
									center: feature.geometry.coordinates as [number, number],
									zoom,
									duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450
								});
							})
							.catch((error: unknown) => {
								console.error('Unable to expand the selected map cluster.', error);
								mapError =
									'This map cluster could not be opened. You can still zoom with the map controls.';
							});
					});

					map.on('click', 'collision-cells', (event) => {
						const feature = event.features?.[0];
						const properties = feature?.properties;
						if (!properties) return;
						const collisionCount = Number(properties.collisionCount);
						const fatalCount = Number(properties.fatalCount);
						if (!Number.isFinite(collisionCount) || !Number.isFinite(fatalCount)) return;

						const details = document.createElement('div');
						const title = document.createElement('strong');
						title.textContent = `${collisionCount.toLocaleString()} historical collision${collisionCount === 1 ? '' : 's'}`;
						const fatal = document.createElement('p');
						fatal.textContent = `${fatalCount.toLocaleString()} recorded fatal outcome${fatalCount === 1 ? '' : 's'}`;
						details.append(title, fatal);
						const activeMap = map;
						if (!activeMap) return;
						new maplibre.Popup({ closeButton: true, closeOnClick: true, maxWidth: '250px' })
							.setLngLat(event.lngLat)
							.setDOMContent(details)
							.addTo(activeMap);
					});

					for (const layer of ['collision-clusters', 'collision-cells']) {
						map.on('mouseenter', layer, () => {
							if (map) map.getCanvas().style.cursor = 'pointer';
						});
						map.on('mouseleave', layer, () => {
							if (map) map.getCanvas().style.cursor = '';
						});
					}
					mapStatus = 'Map ready. Select a cluster or density cell for its historical counts.';
				});

				map.on('error', (event) => {
					if (event.error) {
						console.error('Toronto map reported a rendering or tile error.', event.error);
						mapError = 'Some map tiles could not be loaded. Dataset aggregates remain available where shown.';
					}
				});
			} catch (error) {
				if (disposed) return;
				mapError =
					error instanceof Error ? error.message : 'The map could not be initialized.';
				mapStatus = 'Map unavailable.';
				console.error('Unable to initialize the Toronto collision map.', error);
			}
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					observer.disconnect();
					mapStatus = 'Loading dataset-backed Toronto map…';
					void initializeMap();
				}
			},
			{ rootMargin: '240px' }
		);
		observer.observe(mapElement);
		return () => {
			disposed = true;
			observer.disconnect();
			map?.remove();
		};
	});
</script>

<section class="map-section" id="toronto-map" aria-labelledby="map-heading">
	<div class="section-heading">
		<span class="eyebrow">05 / Historical Toronto collision map</span>
		<h2 id="map-heading">A geographic view of the source records.</h2>
		<p>
			The dataset includes recorded latitude and longitude. The map shows coarse density cells derived
			from those historical records—not live incidents and not locations predicted by the model.
		</p>
	</div>

	<div class="map-card card">
		<div class="map-heading">
			<div>
				<strong>Toronto / Collision record density</strong>
				<span>{summary ? `${summary.geolocatedCollisionCount.toLocaleString()} geolocated collision IDs` : 'Source dataset aggregates'}</span>
			</div>
			<div class="map-legend" aria-label="Map legend">
				<span><i class="fatal-key"></i> Cells with a fatal outcome</span>
				<span><i class="other-key"></i> Other source records</span>
			</div>
		</div>
		<div
			class="map-canvas"
			bind:this={mapElement}
			role="region"
			aria-label="Interactive map of historical Toronto collision density; use arrow keys to pan and plus or minus to zoom"
		></div>
		<p class="map-status" role="status" aria-live="polite">{mapStatus}</p>
		{#if mapError}
			<p class="map-error" role="status">{mapError}</p>
		{/if}
		{#if summary}
			<div class="map-footnote">
				<p>
					{summary.fatalCollisionCount.toLocaleString()} of the mapped collision IDs have at least one
					<code>ACCLASS = Fatal</code> record. Markers are grouped into {summary.gridDegrees}° cells;
					no individual crash locations or identifiers are exposed.
				</p>
				<p>
					Source: <code>TOTAL_KSI_6386614326836635957.csv</code> in the ML_server1 project.
					Records without an <code>ACCNUM</code> are excluded rather than counted as separate crashes.
					Basemap © OpenStreetMap contributors.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	.map-section {
		padding-block: clamp(4.5rem, 9vw, 8.5rem);
		border-top: 1px solid var(--color-border);
	}

	.map-card {
		overflow: hidden;
		box-shadow: none;
	}

	.map-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.2rem;
		padding: 1.1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}

	.map-heading > div:first-child {
		display: grid;
		gap: 0.2rem;
	}

	.map-heading strong {
		font-size: 0.86rem;
	}

	.map-heading span {
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.map-legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 0.8rem;
	}

	.map-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.map-legend i {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
	}

	.fatal-key {
		background: #a94e3d;
	}

	.other-key {
		background: #647b7b;
	}

	.map-canvas {
		width: 100%;
		height: clamp(320px, 52vw, 560px);
		background: var(--color-map-water);
	}

	.map-status,
	.map-error {
		margin: 0;
		padding: 0.65rem 1.25rem 0;
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.map-error {
		color: var(--color-danger);
	}

	.map-footnote {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding: 0.25rem 1.25rem 1rem;
	}

	.map-footnote p {
		margin: 0.5rem 0 0;
		color: var(--color-muted);
		font-size: 0.68rem;
	}

	code {
		color: var(--color-text);
		font-size: 0.95em;
	}

	@media (max-width: 650px) {
		.map-heading {
			align-items: flex-start;
			flex-direction: column;
		}

		.map-legend {
			justify-content: flex-start;
		}

		.map-canvas {
			height: 65vh;
			min-height: 320px;
			max-height: 490px;
		}

		.map-footnote {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
