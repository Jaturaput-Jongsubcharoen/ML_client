export interface TrafficPose {
	x: number;
	z: number;
	heading: number;
}

// A constant-speed rounded rectangle: straight lanes meet tangent quarter-circle turns.
export function trafficPose(distance: number, halfWidth: number, halfDepth: number, radius = 3): TrafficPose {
	const straightX = 2 * (halfWidth - radius);
	const straightZ = 2 * (halfDepth - radius);
	const arc = Math.PI * radius / 2;
	const length = 2 * (straightX + straightZ) + 4 * arc;
	let d = ((distance % length) + length) % length;
	const segments = [
		{ length: straightX, x: -halfWidth + radius, z: -halfDepth, dx: 1, dz: 0 },
		{ length: arc, x: halfWidth - radius, z: -halfDepth + radius, angle: -Math.PI / 2 },
		{ length: straightZ, x: halfWidth, z: -halfDepth + radius, dx: 0, dz: 1 },
		{ length: arc, x: halfWidth - radius, z: halfDepth - radius, angle: 0 },
		{ length: straightX, x: halfWidth - radius, z: halfDepth, dx: -1, dz: 0 },
		{ length: arc, x: -halfWidth + radius, z: halfDepth - radius, angle: Math.PI / 2 },
		{ length: straightZ, x: -halfWidth, z: halfDepth - radius, dx: 0, dz: -1 },
		{ length: arc, x: -halfWidth + radius, z: -halfDepth + radius, angle: Math.PI }
	];
	for (const segment of segments) {
		if (d <= segment.length) {
			if ('angle' in segment && segment.angle !== undefined) {
				const angle = segment.angle + d / radius;
				return { x: segment.x + radius * Math.cos(angle), z: segment.z + radius * Math.sin(angle), heading: -angle };
			}
			const dx = segment.dx ?? 0;
			const dz = segment.dz ?? 0;
			return { x: segment.x + d * dx, z: segment.z + d * dz, heading: Math.atan2(dx, dz) };
		}
		d -= segment.length;
	}
	throw new Error('Traffic path could not resolve a finite distance.');
}
