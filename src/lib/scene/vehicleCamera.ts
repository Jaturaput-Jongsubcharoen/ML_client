import { Box3, MathUtils, Vector3 } from 'three';
import type { TrafficPose } from './traffic';

export function sceneBudget(width: number, cores: number, memory = 8, saveData = false) {
	const low = cores <= 4 || memory <= 4 || saveData;
	return {
		low,
		vehicles: low ? 12 : width <= 640 ? 24 : width <= 1100 ? 30 : 36,
		pixelRatio: low || width <= 640 ? 1 : width <= 1100 ? 1.1 : 1.25
	};
}

export interface FollowFraming {
	/** Vertical field of view in degrees. */
	fov: number;
	/** Boom length from the followed vehicle to the camera. */
	distance: number;
	/** Preferred boom elevation in radians. */
	pitch: number;
	/** Fraction of the viewport height the vehicle sits below centre. */
	frameOffset: number;
	/** Fraction of the viewport width the vehicle sits right of centre, clear of the landing copy. */
	frameShift: number;
}

// Narrow screens get a wider lens, a longer and steeper boom, and a lower vehicle so the
// landing copy keeps the upper frame; wide screens get a flatter, more cinematic angle with
// the vehicle shifted right of the left-aligned landing copy.
export function followFraming(aspect: number): FollowFraming {
	const wide = MathUtils.clamp((aspect - 0.45) / (1.9 - 0.45), 0, 1);
	return {
		fov: MathUtils.lerp(54, 40, wide),
		distance: MathUtils.lerp(40, 34, wide),
		pitch: MathUtils.lerp(0.68, 0.56, wide),
		frameOffset: MathUtils.lerp(0.18, 0.12, wide),
		frameShift: MathUtils.lerp(0, 0.13, wide)
	};
}

export interface FollowInput {
	/** Cursor/touch yaw offset around the vehicle, in radians. */
	yawOffset?: number;
	/** Cursor pitch offset added to the preferred elevation, in radians. */
	pitchOffset?: number;
	/** Heading the vehicle will have shortly; lets the boom crane up before corners. */
	aheadHeading?: number;
	/** Jump straight to the goal pose (first frame, reduced motion). */
	snap?: boolean;
}

const IDLE: FollowInput = {};
const MAX_PITCH = 1.45;
const TARGET_HEIGHT = 0.9;
const SWEEP_SAMPLES = 4;
const PITCH_ACCEL = 3;
/** Seconds of route the boom looks ahead to anticipate corners. */
export const FOLLOW_LOOKAHEAD = 1.6;

export class VehicleCamera {
	readonly position = new Vector3();
	readonly target = new Vector3();
	private heading = 0;
	private boomPitch = 0;
	private pitchSpeed = 0;
	private boomYaw = 0;
	private initialized = false;

	constructor(private readonly buildings: Box3[]) {}

	get yaw() {
		return this.boomYaw;
	}

	get pitch() {
		return this.boomPitch;
	}

	update(pose: TrafficPose, aspect: number, dt: number, input: FollowInput = IDLE) {
		const { yawOffset = 0, pitchOffset = 0, snap = false } = input;
		const aheadHeading = input.aheadHeading ?? pose.heading;
		const immediate = snap || !this.initialized;
		const framing = followFraming(aspect);
		const track = immediate ? 1 : 1 - Math.exp(-12 * dt);
		const turn = immediate ? 1 : 1 - Math.exp(-5 * dt);
		const delta = Math.atan2(Math.sin(pose.heading - this.heading), Math.cos(pose.heading - this.heading));
		this.heading = immediate ? pose.heading : this.heading + delta * turn;
		this.target.x += (pose.x - this.target.x) * track;
		this.target.y = TARGET_HEIGHT;
		this.target.z += (pose.z - this.target.z) * track;
		if (immediate) {
			this.target.x = pose.x;
			this.target.z = pose.z;
		}

		const yaw = this.heading + yawOffset;
		const length = framing.distance;
		const preferred = MathUtils.clamp(framing.pitch + pitchOffset, 0.4, 1.1);
		// Anticipate the boom sweeping toward the heading the vehicle will have shortly, so the
		// crane rises before a corner roof enters the sightline instead of snapping upward.
		const sweep = Math.atan2(Math.sin(aheadHeading - this.heading), Math.cos(aheadHeading - this.heading));
		let goal = Math.max(preferred, this.requiredPitch(yaw, length, 1));
		for (let step = 1; step <= SWEEP_SAMPLES; step++) {
			goal = Math.max(goal, this.requiredPitch(yaw + (sweep * step) / SWEEP_SAMPLES, length, 1));
		}
		goal = Math.min(goal, MAX_PITCH);
		if (immediate) {
			this.boomPitch = goal;
			this.pitchSpeed = 0;
		} else if (dt > 0) {
			// Ease toward the goal with capped angular speed and acceleration, so crane lifts
			// start and stop gently instead of kicking the camera upward.
			const rising = goal > this.boomPitch;
			const gap = goal - this.boomPitch;
			const eased = (gap * (1 - Math.exp(-(rising ? 5 : 1.4) * dt))) / dt;
			// Never faster than the speed from which the crane can still brake before the goal.
			const braking = Math.sqrt(2 * PITCH_ACCEL * Math.abs(gap));
			const wanted = MathUtils.clamp(eased, Math.max(-0.45, -braking), Math.min(1.1, braking));
			this.pitchSpeed += MathUtils.clamp(wanted - this.pitchSpeed, -PITCH_ACCEL * dt, PITCH_ACCEL * dt);
			this.boomPitch += this.pitchSpeed * dt;
		}
		const floor = this.requiredPitch(yaw, length, 0.6);
		if (this.boomPitch < floor) this.boomPitch = floor;
		if (this.boomPitch >= MAX_PITCH) {
			this.boomPitch = MAX_PITCH;
			this.pitchSpeed = Math.min(this.pitchSpeed, 0);
		}
		this.boomYaw = yaw;

		const height = length * Math.sin(this.boomPitch);
		const reach = this.clearReach(yaw, length * Math.cos(this.boomPitch), height);
		this.position.set(
			this.target.x - Math.sin(yaw) * reach,
			this.target.y + height,
			this.target.z - Math.cos(yaw) * reach
		);
		this.initialized = true;
	}

	// Distance along the horizontal boom direction at which it enters a (margin-expanded)
	// footprint, or Infinity when the boom misses it.
	private entry(box: Box3, dirX: number, dirZ: number, reach: number, margin: number) {
		let near = 0;
		let far = reach;
		if (Math.abs(dirX) < 1e-9) {
			if (this.target.x < box.min.x - margin || this.target.x > box.max.x + margin) return Infinity;
		} else {
			const a = (box.min.x - margin - this.target.x) / dirX;
			const b = (box.max.x + margin - this.target.x) / dirX;
			near = Math.max(near, Math.min(a, b));
			far = Math.min(far, Math.max(a, b));
		}
		if (Math.abs(dirZ) < 1e-9) {
			if (this.target.z < box.min.z - margin || this.target.z > box.max.z + margin) return Infinity;
		} else {
			const a = (box.min.z - margin - this.target.z) / dirZ;
			const b = (box.max.z + margin - this.target.z) / dirZ;
			near = Math.max(near, Math.min(a, b));
			far = Math.min(far, Math.max(a, b));
		}
		return near > far ? Infinity : near;
	}

	// Lowest boom elevation whose sightline from the vehicle to the camera clears every roof:
	// either the camera stops short of the footprint or the line passes over its roof edge.
	private requiredPitch(yaw: number, length: number, margin: number) {
		const dirX = -Math.sin(yaw);
		const dirZ = -Math.cos(yaw);
		let pitch = 0;
		for (const box of this.buildings) {
			const enter = this.entry(box, dirX, dirZ, length, margin);
			if (enter === Infinity) continue;
			const rise = box.max.y + margin - TARGET_HEIGHT;
			pitch = Math.max(pitch, Math.min(Math.acos(Math.min(1, enter / length)), Math.atan2(rise, enter)));
		}
		return pitch;
	}

	// Final guarantee when the elevation is capped: shorten the horizontal reach so the
	// sightline still clears any roof it crosses.
	private clearReach(yaw: number, reach: number, height: number) {
		const dirX = -Math.sin(yaw);
		const dirZ = -Math.cos(yaw);
		for (const box of this.buildings) {
			const enter = this.entry(box, dirX, dirZ, reach, 0.3);
			if (enter === Infinity) continue;
			const rise = box.max.y + 0.3 - TARGET_HEIGHT;
			if (enter * height / reach < rise) reach = Math.max(0, enter * height / rise);
		}
		return reach;
	}
}
