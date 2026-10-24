export interface TrafficPose {
	x: number;
	z: number;
	heading: number;
}

export function trafficLength(halfWidth: number, halfDepth: number, radius = 3): number {
	return 4 * (halfWidth + halfDepth - 2 * radius) + 2 * Math.PI * radius;
}

export interface TrafficVehicle {
	width: number;
	depth: number;
	speed: number;
	distance: number;
	pose: TrafficPose;
}

export function createTrafficFleet(count: number): TrafficVehicle[] {
	return Array.from({ length: count }, (_, index) => {
		const route = index % 6;
		const ring = 90 - Math.floor(route / 2) * 30;
		const reverse = route % 2 === 1;
		const width = ring + (reverse ? 1.65 : -1.65);
		const routeCount = Math.ceil((count - route) / 6);
		const distance = trafficLength(width, width) * (Math.floor(index / 6) + route / 6) / routeCount;
		return {
			width,
			depth: width,
			// Shared lane speeds preserve headway; the six routes have distinct speeds.
			speed: (3.4 + route * 0.28) * (reverse ? -1 : 1),
			distance,
			pose: trafficPose(distance, width, width)
		};
	});
}

export function chooseFollowVehicle(count: number, previous: number, random = Math.random()): number {
	if (count <= 1) return 0;
	const excludePrevious = Number.isInteger(previous) && previous >= 0 && previous < count;
	const choices = count - (excludePrevious ? 1 : 0);
	const choice = Math.min(choices - 1, Math.floor(Math.max(0, random) * choices));
	return excludePrevious && choice >= previous ? choice + 1 : choice;
}

// Straight lanes and tangent quarter-circle turns, with optional pooled output.
export function trafficPose(
	distance: number,
	halfWidth: number,
	halfDepth: number,
	radius = 3,
	result: TrafficPose = { x: 0, z: 0, heading: 0 }
): TrafficPose {
	const straightX = 2 * (halfWidth - radius);
	const straightZ = 2 * (halfDepth - radius);
	const arc = Math.PI * radius / 2;
	const length = trafficLength(halfWidth, halfDepth, radius);
	let d = ((distance % length) + length) % length;
	for (let segment = 0; segment < 8; segment++) {
		const segmentLength = segment % 2 ? arc : segment % 4 === 0 ? straightX : straightZ;
		if (d <= segmentLength) {
			if (segment % 2) {
				const angle = (segment - 3) * Math.PI / 4 + d / radius;
				const centerX = segment < 4 ? halfWidth - radius : -halfWidth + radius;
				const centerZ = segment === 1 || segment === 7 ? -halfDepth + radius : halfDepth - radius;
				result.x = centerX + radius * Math.cos(angle);
				result.z = centerZ + radius * Math.sin(angle);
				result.heading = -angle;
			} else {
				const side = segment / 2;
				const dx = side === 0 ? 1 : side === 2 ? -1 : 0;
				const dz = side === 1 ? 1 : side === 3 ? -1 : 0;
				result.x = (side === 0 || side === 3 ? -1 : 1) * (halfWidth - (dx ? radius : 0)) + d * dx;
				result.z = (side < 2 ? -1 : 1) * (halfDepth - (dz ? radius : 0)) + d * dz;
				result.heading = Math.atan2(dx, dz);
			}
			return result;
		}
		d -= segmentLength;
	}
	throw new Error('Traffic path could not resolve a finite distance.');
}
