import { Box3, MathUtils, PerspectiveCamera, Vector3 } from 'three';

export function fitCameraDistance(
	bounds: Box3,
	target: Vector3,
	camera: PerspectiveCamera,
	yaw: number,
	elevation: number
): number {
	const sinYaw = Math.sin(yaw);
	const cosYaw = Math.cos(yaw);
	const sinElevation = Math.sin(elevation);
	const cosElevation = Math.cos(elevation);
	const right = new Vector3(cosYaw, 0, -sinYaw);
	const up = new Vector3(-sinYaw * sinElevation, cosElevation, -cosYaw * sinElevation);
	const backward = new Vector3(sinYaw * cosElevation, sinElevation, cosYaw * cosElevation);
	const verticalTangent = Math.tan(MathUtils.degToRad(camera.getEffectiveFOV()) / 2);
	const horizontalTangent = verticalTangent * camera.aspect;
	// Landscape follows the reference's close skyline crop; portrait keeps the full city width.
	const verticalFrame = MathUtils.lerp(0.8, 1.12, MathUtils.clamp((camera.aspect - 1) / 0.6, 0, 1));
	const offset = new Vector3();
	let distance = 0;

	for (const x of [bounds.min.x, bounds.max.x]) {
		for (const y of [bounds.min.y, bounds.max.y]) {
			for (const z of [bounds.min.z, bounds.max.z]) {
				offset.set(x, y, z).sub(target);
				const depth = offset.dot(backward);
				distance = Math.max(
					distance,
					depth + Math.abs(offset.dot(right)) / (horizontalTangent * 0.86),
					depth + Math.abs(offset.dot(up)) / (verticalTangent * verticalFrame)
				);
			}
		}
	}
	return distance;
}
