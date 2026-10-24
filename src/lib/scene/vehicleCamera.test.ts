import { describe, expect, it } from 'vitest';
import { Box3, PerspectiveCamera, Ray, Vector3 } from 'three';
import { createTrafficFleet, trafficPose, type TrafficPose } from './traffic';
import { FOLLOW_LOOKAHEAD, followFraming, sceneBudget, VehicleCamera } from './vehicleCamera';

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

const viewports = [[400, 824], [1920, 1080], [3440, 1440]] as const;

describe('vehicle follow camera', () => {
	it('caps pixel ratio and varies fleet size by actual device capabilities', () => {
		expect(sceneBudget(400, 8, 8)).toMatchObject({ vehicles: 24, pixelRatio: 1 });
		expect(sceneBudget(1440, 8, 8)).toMatchObject({ vehicles: 36, pixelRatio: 1.25 });
		for (const budget of [sceneBudget(1440, 4), sceneBudget(1440, 8, 4), sceneBudget(1440, 8, 8, true)]) {
			expect(budget).toMatchObject({ vehicles: 12, pixelRatio: 1, low: true });
		}
	});

	it('frames every aspect with a diagonal chase angle that widens on narrow screens', () => {
		const aspects = [0.3, 375 / 812, 400 / 824, 768 / 1024, 1, 1440 / 900, 1920 / 1080, 3440 / 1440];
		const framings = aspects.map(followFraming);
		for (const framing of framings) {
			// Neither a flat street-level shot nor a top-down map view.
			expect(framing.pitch).toBeGreaterThan(0.5);
			expect(framing.pitch).toBeLessThan(0.75);
			expect(framing.distance).toBeGreaterThanOrEqual(34);
			expect(framing.distance).toBeLessThanOrEqual(40);
			expect(framing.frameShift).toBeGreaterThanOrEqual(0);
			expect(framing.frameShift).toBeLessThanOrEqual(0.13);
		}
		expect(followFraming(400 / 824).frameShift).toBeLessThan(0.02);
		for (let index = 1; index < framings.length; index++) {
			expect(framings[index].fov).toBeLessThanOrEqual(framings[index - 1].fov);
			expect(framings[index].pitch).toBeLessThanOrEqual(framings[index - 1].pitch);
			expect(framings[index].frameShift).toBeGreaterThanOrEqual(framings[index - 1].frameShift);
		}
	});

	it('looks at the vehicle from behind and above on a straight road', () => {
		const rig = new VehicleCamera([]);
		const pose: TrafficPose = { x: 10, z: 20, heading: 0 };
		rig.update(pose, 16 / 9, 1 / 30);
		expect(rig.pitch).toBeCloseTo(followFraming(16 / 9).pitch, 5);
		expect(rig.position.z).toBeLessThan(pose.z - 20);
		expect(rig.position.x).toBeCloseTo(pose.x, 5);
		expect(rig.position.y).toBeGreaterThan(15);
		expect(rig.position.y).toBeLessThan(25);
	});

	for (const [width, height] of viewports) {
		it.each([0, 1, 2, 3, 4, 5])(`keeps the vehicle framed, clear and smooth at ${width}x${height} through lane %i`, (lane) => {
			const boxes = cityObstacles();
			const vehicle = createTrafficFleet(36)[lane];
			const framing = followFraming(width / height);
			const camera = new PerspectiveCamera(framing.fov, width / height, 0.5, 600);
			camera.setViewOffset(width, height, -width * framing.frameShift, -height * framing.frameOffset, width, height);
			const ahead: TrafficPose = { x: 0, z: 0, heading: 0 };
			const input = { yawOffset: 0, aheadHeading: 0 };
			const previous = new Vector3();
			const velocity = new Vector3();
			const lastVelocity = new Vector3();
			const direction = new Vector3();
			const hit = new Vector3();
			const ray = new Ray();
			const rig = new VehicleCamera(boxes);
			const flip = vehicle.speed < 0 ? Math.PI : 0;
			let largestStep = 0;
			let largestJerk = 0;
			let diagonal = 0;
			for (let frame = 0; frame < 6600; frame++) {
				const seconds = frame / 30;
				trafficPose(vehicle.distance + vehicle.speed * seconds, vehicle.width, vehicle.depth, 3, vehicle.pose);
				trafficPose(vehicle.distance + vehicle.speed * (seconds + FOLLOW_LOOKAHEAD), vehicle.width, vehicle.depth, 3, ahead);
				vehicle.pose.heading += flip;
				input.aheadHeading = ahead.heading + flip;
				input.yawOffset = Math.sin(frame / 100) * 0.12;
				rig.update(vehicle.pose, camera.aspect, 1 / 30, input);
				if (frame) {
					velocity.subVectors(rig.position, previous);
					largestStep = Math.max(largestStep, velocity.length());
					if (frame > 1) largestJerk = Math.max(largestJerk, velocity.distanceTo(lastVelocity));
					lastVelocity.copy(velocity);
				}
				previous.copy(rig.position);
				if (rig.pitch < framing.pitch + 0.05) diagonal++;
				expect(rig.pitch).toBeLessThanOrEqual(1.45 + 1e-9);
				if (frame % 20) continue;
				camera.position.copy(rig.position);
				camera.lookAt(rig.target);
				camera.updateMatrixWorld();
				const projection = new Vector3(vehicle.pose.x, 0.9, vehicle.pose.z).project(camera);
				expect(Math.abs((projection.x + 1) / 2 - 0.5 - framing.frameShift)).toBeLessThan(0.025);
				expect((1 - projection.y) / 2).toBeGreaterThan(0.58);
				expect((1 - projection.y) / 2).toBeLessThan(0.72);
				ray.set(rig.target, direction.subVectors(rig.position, rig.target).normalize());
				for (const box of boxes) {
					expect(box.containsPoint(rig.position)).toBe(false);
					const intersect = ray.intersectBox(box, hit);
					expect(intersect && hit.distanceTo(rig.target) < rig.position.distanceTo(rig.target)).toBeFalsy();
				}
			}
			// The boom sweeps continuously (no snaps) and keeps the diagonal angle most of the
			// time, only craning up near tall corner blocks.
			expect(largestStep).toBeLessThan(1.8);
			// Beside the CN Tower the capped crane briefly shortens its reach, the largest kick.
			expect(largestJerk).toBeLessThan(0.7);
			expect(diagonal / 6600).toBeGreaterThan(0.5);
		});
	}
});
