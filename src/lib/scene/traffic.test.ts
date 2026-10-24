import { expect, it } from 'vitest';
import { chooseFollowVehicle, createTrafficFleet, trafficLength, trafficPose } from './traffic';

it('keeps vehicles on a closed, finite route with smooth tangent turns', () => {
	const w = 35, h = 11, r = 3;
	const length = 4 * (w + h - 2 * r) + 2 * Math.PI * r;
	expect(trafficPose(0, w, h)).toEqual(trafficPose(length, w, h));
	for (let d = 0; d < length; d += 0.25) {
		const p = trafficPose(d, w, h);
		const next = trafficPose(d + 0.01, w, h);
		expect(Math.abs(p.x)).toBeLessThanOrEqual(w);
		expect(Math.abs(p.z)).toBeLessThanOrEqual(h);
		expect(Math.hypot(next.x - p.x, next.z - p.z)).toBeCloseTo(0.01, 4);
		expect(Math.sin(p.heading)).toBeCloseTo((next.x - p.x) / 0.01, 2);
	}
});

it('reuses the supplied pose through negative distances and every route boundary', () => {
	const pose = { x: 0, z: 0, heading: 0 };
	for (let distance = -1000; distance <= 1000; distance += 0.5) {
		expect(trafficPose(distance, 30, 60, 3, pose)).toBe(pose);
		const next = trafficPose(distance + 0.001, 30, 60);
		expect(Math.hypot(next.x - pose.x, next.z - pose.z)).toBeCloseTo(0.001, 5);
	}
});

it('keeps all six opposing lanes on roads with safe headways for an entire route cycle', () => {
	const fleet = createTrafficFleet(36);
	const roads = [-90, -60, -30, 0, 30, 60, 90];
	let closest = Infinity;
	let overlap = '';
	const footprints = fleet.map((_, index) => {
		const type = index % 12;
		return { width: type === 0 ? 1.65 : type === 5 ? 1.45 : 1.25, length: type === 0 ? 5.2 : type === 5 ? 4 : type === 7 ? 3.6 : 2.8 };
	});
	for (let time = 0; time < 220; time += 0.25) {
		for (const vehicle of fleet) {
			trafficPose(vehicle.distance + time * vehicle.speed, vehicle.width, vehicle.depth, 3, vehicle.pose);
			const { x, z } = vehicle.pose;
			expect(roads.some((road) => Math.abs(x - road) <= 3.5 || Math.abs(z - road) <= 3.5)).toBe(true);
			expect(Math.abs(x)).toBeLessThan(94);
			expect(Math.abs(z)).toBeLessThan(94);
		}
		for (let a = 0; a < fleet.length; a++) {
			for (let b = a + 1; b < fleet.length; b++) {
				const poseA = fleet[a].pose, poseB = fleet[b].pose;
				const dx = poseB.x - poseA.x, dz = poseB.z - poseA.z;
				const separation = Math.hypot(dx, dz);
				closest = Math.min(closest, separation);
				if (separation > 6) continue;
				const forwardA = [Math.sin(poseA.heading), Math.cos(poseA.heading)];
				const rightA = [Math.cos(poseA.heading), -Math.sin(poseA.heading)];
				const forwardB = [Math.sin(poseB.heading), Math.cos(poseB.heading)];
				const rightB = [Math.cos(poseB.heading), -Math.sin(poseB.heading)];
				const separated = [forwardA, rightA, forwardB, rightB].some(([x, z]) => {
					const radiusA = Math.abs(x * forwardA[0] + z * forwardA[1]) * footprints[a].length / 2 +
						Math.abs(x * rightA[0] + z * rightA[1]) * footprints[a].width / 2;
					const radiusB = Math.abs(x * forwardB[0] + z * forwardB[1]) * footprints[b].length / 2 +
						Math.abs(x * rightB[0] + z * rightB[1]) * footprints[b].width / 2;
					return Math.abs(dx * x + dz * z) > radiusA + radiusB;
				});
				if (!separated) overlap = `Vehicle bodies ${a} and ${b} overlap at ${time}s`;
			}
		}
	}
	expect(overlap).toBe('');
	expect(closest).toBeGreaterThan(3.2);
	for (let route = 0; route < 6; route++) {
		const lane = fleet.filter((_, index) => index % 6 === route);
		expect(trafficLength(lane[0].width, lane[0].depth) / lane.length).toBeGreaterThan(30);
		expect(new Set(lane.map((vehicle) => vehicle.speed)).size).toBe(1);
	}
});

it('randomizes eligible follow vehicles without repeating the previous selection', () => {
	for (const count of [12, 24, 30, 36]) {
		for (let previous = -1; previous < count; previous++) {
			const choices = new Set<number>();
			for (let index = 0; index < count * 2; index++) {
				const selected = chooseFollowVehicle(count, previous, index / (count * 2));
				expect(selected).toBeGreaterThanOrEqual(0);
				expect(selected).toBeLessThan(count);
				expect(selected).not.toBe(previous);
				choices.add(selected);
			}
			expect(choices.size).toBe(count - (previous >= 0 ? 1 : 0));
		}
	}
});
