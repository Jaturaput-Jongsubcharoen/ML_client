import { expect, it } from 'vitest';
import { trafficPose } from './traffic';

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
