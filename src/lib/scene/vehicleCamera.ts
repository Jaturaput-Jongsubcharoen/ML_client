import { Box3, MathUtils, Vector3 } from 'three';
import type { TrafficPose } from './traffic';

export function usesVehicleCamera(width: number, height: number): boolean {
	return width / height < 1.1 || (width <= 700 && width / height < 1.5);
}

export function sceneBudget(width: number, cores: number, memory = 8, saveData = false) {
	const low = cores <= 4 || memory <= 4 || saveData;
	return {
		low,
		vehicles: low ? 12 : width <= 640 ? 24 : width <= 1100 ? 30 : 36,
		pixelRatio: low || width <= 640 ? 1 : width <= 1100 ? 1.1 : 1.25
	};
}

export class VehicleCamera {
	readonly position = new Vector3();
	readonly target = new Vector3();
	private readonly offset = new Vector3();
	private heading = 0;
	private initialized = false;

	constructor(private readonly buildings: Box3[]) {}

	update(pose: TrafficPose, aspect: number, dt: number, exploration = 0, snap = false) {
		const immediate = snap || !this.initialized;
		const track = immediate ? 1 : 1 - Math.exp(-12 * dt);
		const turn = immediate ? 1 : 1 - Math.exp(-12 * dt);
		const delta = Math.atan2(Math.sin(pose.heading - this.heading), Math.cos(pose.heading - this.heading));
		this.heading = immediate ? pose.heading : this.heading + delta * turn;
		this.target.x += (pose.x - this.target.x) * track;
		this.target.y = 0.9;
		this.target.z += (pose.z - this.target.z) * track;
		const yaw = this.heading + exploration;
		const height = MathUtils.lerp(43, 39, MathUtils.clamp((aspect - 0.35) / 0.65, 0, 1));
		let reach = 9;
		for (const box of this.buildings) {
			const dx = Math.max(box.min.x - this.target.x, 0, this.target.x - box.max.x);
			const dz = Math.max(box.min.z - this.target.z, 0, this.target.z - box.max.z);
			reach = Math.min(reach, Math.hypot(dx, dz) * height / (box.max.y + 1 - this.target.y) * 0.85);
		}
		const smooth = immediate ? 1 : 1 - Math.exp(-12 * dt);
		this.offset.x += (-Math.sin(yaw) * reach - this.offset.x) * smooth;
		this.offset.z += (-Math.cos(yaw) * reach - this.offset.z) * smooth;
		this.offset.y = height;

		// A continuous roof-clearance cone avoids abrupt boom corrections at box
		// corners. Clamp after damping too, so lag cannot carry the view behind a roof.
		const scale = Math.min(1, reach / Math.max(Math.hypot(this.offset.x, this.offset.z), 0.001));
		this.position.set(
			this.target.x + this.offset.x * scale,
			this.target.y + height,
			this.target.z + this.offset.z * scale
		);
		this.initialized = true;
	}
}
