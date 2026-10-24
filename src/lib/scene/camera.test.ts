import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { fitCameraDistance } from './camera';

const bounds = new Box3(new Vector3(-99, 0, -99), new Vector3(99, 38, 104));
const environment = new Box3(new Vector3(-150, -1.55, -115), new Vector3(150, 88.725, 173));
const towerBounds = new Box3(new Vector3(-56.34, 0, 92.66), new Vector3(-43.66, 88.725, 105.34));
const target = new Vector3(0, 6, 0);
const yaw = 0.65;
const elevation = 0.6;

function distanceFor(camera: PerspectiveCamera) {
	return Math.max(
		fitCameraDistance(bounds, target, camera, yaw, elevation),
		fitCameraDistance(towerBounds, target, camera, yaw, elevation)
	);
}

describe('city camera framing', () => {
	it.each([
		[3440, 1440], [1920, 1080], [1440, 900], [1024, 768],
		[768, 1024], [540, 720], [430, 932], [390, 844], [360, 800], [280, 740]
	])('frames the skyline and waterfront tower at %ix%i', (width, height) => {
		const camera = new PerspectiveCamera(38, width / height, 0.1, 3000);
		const distance = distanceFor(camera);
		const framingDepth = environment.getSize(new Vector3()).length();
		camera.near = Math.max(1, distance - framingDepth);
		camera.far = distance + framingDepth;
		camera.updateProjectionMatrix();
		camera.position.set(
			target.x + Math.sin(yaw) * distance * Math.cos(elevation),
			target.y + Math.sin(elevation) * distance,
			target.z + Math.cos(yaw) * distance * Math.cos(elevation)
		);
		camera.lookAt(target);
		camera.updateMatrixWorld();

		for (const x of [bounds.min.x, bounds.max.x]) {
			for (const y of [bounds.min.y, bounds.max.y]) {
				for (const z of [bounds.min.z, bounds.max.z]) {
					const projected = new Vector3(x, y, z).project(camera);
					expect(Math.abs(projected.x)).toBeLessThanOrEqual(0.861);
					const verticalFrame = 0.8 + 0.32 * Math.max(0, Math.min(1, (camera.aspect - 1) / 0.6));
					expect(Math.abs(projected.y)).toBeLessThanOrEqual(verticalFrame + 0.001);
					expect(projected.z).toBeGreaterThan(-1);
					expect(projected.z).toBeLessThan(1);
				}
			}
		}

		for (const height of [0, 60.45, 88.725]) {
			const tower = new Vector3(-50, height, 99).project(camera);
			expect(tower.x).toBeLessThan(0);
			expect(tower.x).toBeGreaterThan(-0.86);
			expect(Math.abs(tower.y)).toBeLessThan(0.9);
		}
	});

	it('matches the reference scale rather than fitting distant water and empty ground', () => {
		const camera = new PerspectiveCamera(38, 1423 / 675);
		const distance = distanceFor(camera);
		camera.position.set(
			target.x + Math.sin(yaw) * distance * Math.cos(elevation),
			target.y + Math.sin(elevation) * distance,
			target.z + Math.cos(yaw) * distance * Math.cos(elevation)
		);
		camera.lookAt(target);
		camera.updateMatrixWorld();
		const towerTip = new Vector3(-50, 88.725, 99).project(camera);
		const towerBase = new Vector3(-50, 0, 99).project(camera);
		const tipX = (towerTip.x + 1) / 2;
		const tipY = (1 - towerTip.y) / 2;
		expect(tipX).toBeGreaterThan(0.18);
		expect(tipX).toBeLessThan(0.3);
		expect(tipY).toBeGreaterThan(0.15);
		expect(tipY).toBeLessThan(0.35);
		expect((towerTip.y - towerBase.y) / 2).toBeGreaterThan(0.32);
		expect(distance).toBeLessThan(370);
	});

	it('increases distance continuously as portrait aspect ratios narrow', () => {
		const distances = [1.01, 1, 0.99, 0.75, 0.5, 0.38].map((aspect) =>
			distanceFor(new PerspectiveCamera(38, aspect))
		);
		expect(distances).toEqual([...distances].sort((a, b) => a - b));
		expect(distances[2] / distances[0]).toBeLessThan(1.03);
	});

	it('keeps the environment inside the depth range throughout cursor orbit and tilt', () => {
		const camera = new PerspectiveCamera(38, 1440 / 900);
		const distance = distanceFor(camera);
		const framingDepth = environment.getSize(new Vector3()).length();
		camera.near = Math.max(1, distance - framingDepth);
		camera.far = distance + framingDepth;
		camera.updateProjectionMatrix();

		for (const angle of [yaw - Math.PI * 0.7, yaw, yaw + Math.PI * 0.7]) {
			for (const pitch of [elevation - 0.12, elevation, elevation + 0.12]) {
				camera.position.set(
					target.x + Math.sin(angle) * distance * Math.cos(pitch),
					target.y + Math.sin(pitch) * distance,
					target.z + Math.cos(angle) * distance * Math.cos(pitch)
				);
				camera.lookAt(target);
				camera.updateMatrixWorld();
				for (const x of [environment.min.x, environment.max.x]) {
					for (const y of [environment.min.y, environment.max.y]) {
						for (const z of [environment.min.z, environment.max.z]) {
							const depth = new Vector3(x, y, z).project(camera).z;
							expect(depth).toBeGreaterThan(-1);
							expect(depth).toBeLessThan(1);
						}
					}
				}
			}
		}
	});
});
