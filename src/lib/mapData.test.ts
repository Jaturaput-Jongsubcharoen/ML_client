import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface MapData {
	metadata: {
		sourceRows: number;
		geolocatedCollisionCount: number;
		fatalCollisionCount: number;
		cellCount: number;
	};
	collection: {
		type: 'FeatureCollection';
		features: Array<{
			geometry: { type: 'Point'; coordinates: [number, number] };
			properties: { collisionCount: number; fatalCount: number };
		}>;
	};
}

const mapData = JSON.parse(
	readFileSync(new URL('../../static/data/toronto-collision-density.json', import.meta.url), 'utf8')
) as MapData;

describe('generated Toronto map aggregates', () => {
	it('contains only valid Toronto-area density cells derived from identified collisions', () => {
		expect(mapData.collection.type).toBe('FeatureCollection');
		expect(mapData.collection.features).toHaveLength(mapData.metadata.cellCount);
		expect(mapData.metadata.sourceRows).toBeGreaterThan(mapData.metadata.geolocatedCollisionCount);

		const collisionTotal = mapData.collection.features.reduce(
			(total, feature) => total + feature.properties.collisionCount,
			0
		);
		const fatalTotal = mapData.collection.features.reduce(
			(total, feature) => total + feature.properties.fatalCount,
			0
		);
		expect(collisionTotal).toBe(mapData.metadata.geolocatedCollisionCount);
		expect(fatalTotal).toBe(mapData.metadata.fatalCollisionCount);

		for (const feature of mapData.collection.features) {
			const [longitude, latitude] = feature.geometry.coordinates;
			expect(latitude).toBeGreaterThan(43.5);
			expect(latitude).toBeLessThan(44);
			expect(longitude).toBeGreaterThan(-80);
			expect(longitude).toBeLessThan(-79);
			expect(feature.properties.fatalCount).toBeLessThanOrEqual(
				feature.properties.collisionCount
			);
		}
	});
});
