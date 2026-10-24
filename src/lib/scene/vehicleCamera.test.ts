import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Ray, Vector3 } from 'three';
import { createTrafficFleet, trafficPose } from './traffic';
import { sceneBudget, usesVehicleCamera, VehicleCamera } from './vehicleCamera';

function cityObstacles() {
	const boxes: Box3[] = [];
	for (let row = 0; row < 6; row++) {
		for (let column = 0; column < 6; column++) {
			for (let plot = 0; plot < 2; plot++) {
				const seed = (row * 53 + column * 29 + plot * 17) % 97;
				const x = -75 + column * 30 + (plot === 0 ? -5.5 : 5.5);
				const z = -75 + row * 30 + (plot === 0 ? -4.5 : 4.5);
				const width = 8 + (seed % 3) * 0.55;
				const depth = 7.6 + (seed % 2) * 0.7;
				boxes.push(new Box3(
					new Vector3(x - width / 2 - 0.6, 0, z - depth / 2 - 0.6),
					new Vector3(x + width / 2 + 0.6, 16 + (seed % 19) * 1.15 + 0.46, z + depth / 2 + 0.6)
				));
			}
		}
	}
	boxes.push(new Box3(new Vector3(-56.34, 0, 92.66), new Vector3(-43.66, 88.725, 105.34)));
	return boxes;
}

describe('responsive vehicle camera', () => {
	it.each([[375, 812], [400, 824], [430, 932], [280, 740], [540, 720], [768, 1024], [1024, 1366]])(
		'uses close tracking at %ix%i', (width, height) => expect(usesVehicleCamera(width, height)).toBe(true)
	);
	it.each([[844, 390], [1024, 768], [1366, 1024], [1440, 900], [3440, 1440]])(
		'preserves the overview at %ix%i', (width, height) => expect(usesVehicleCamera(width, height)).toBe(false)
	);
	it('caps pixel ratio and varies fleet size by actual device capabilities', () => {
		expect(sceneBudget(400, 8, 8)).toMatchObject({ vehicles: 24, pixelRatio: 1 });
		expect(sceneBudget(1440, 8, 8)).toMatchObject({ vehicles: 36, pixelRatio: 1.25 });
		for (const budget of [sceneBudget(1440, 4), sceneBudget(1440, 8, 4), sceneBudget(1440, 8, 8, true)]) {
			expect(budget).toMatchObject({ vehicles: 12, pixelRatio: 1, low: true });
		}
	});

	it.each([0, 1, 2, 3, 4, 5])('keeps the vehicle visible, clear and smooth through lane %i and its turns', (lane) => {
		const boxes = cityObstacles();
		const vehicle = createTrafficFleet(36)[lane];
		const camera = new PerspectiveCamera(50, 400 / 824, 0.5, 600);
		camera.setViewOffset(400, 824, 0, -824 * 0.18, 400, 824);
		const previous = new Vector3();
		const direction = new Vector3();
		const hit = new Vector3();
		const ray = new Ray();
		const rig = new VehicleCamera(boxes);
		let largestStep = 0;
		let largestAt = '';
		for (let frame = 0; frame < 6600; frame++) {
			trafficPose(vehicle.distance + vehicle.speed * frame / 30, vehicle.width, vehicle.depth, 3, vehicle.pose);
			if (vehicle.speed < 0) vehicle.pose.heading += Math.PI;
			rig.update(vehicle.pose, camera.aspect, 1 / 30, Math.sin(frame / 100) * 0.18);
			if (frame && rig.position.distanceTo(previous) > largestStep) {
				largestStep = rig.position.distanceTo(previous);
				largestAt = JSON.stringify({ frame, pose: vehicle.pose, from: previous.toArray(), to: rig.position.toArray(), route: vehicle.width });
			}
			previous.copy(rig.position);
			if (frame % 20) continue;
			camera.position.copy(rig.position);
			camera.lookAt(rig.target);
			camera.updateMatrixWorld();
			const projection = new Vector3(vehicle.pose.x, 0.9, vehicle.pose.z).project(camera);
			expect(Math.abs(projection.x)).toBeLessThan(0.15);
			expect((1 - projection.y) / 2).toBeGreaterThan(0.60);
			expect((1 - projection.y) / 2).toBeLessThan(0.74);
			ray.set(rig.target, direction.subVectors(rig.position, rig.target).normalize());
			for (const box of boxes) {
				expect(box.containsPoint(rig.position)).toBe(false);
				const intersect = ray.intersectBox(box, hit);
				expect(intersect && hit.distanceTo(rig.target) < rig.position.distanceTo(rig.target)).toBeFalsy();
			}
		}
		expect(largestStep, largestAt).toBeLessThan(0.7);
	});
});
