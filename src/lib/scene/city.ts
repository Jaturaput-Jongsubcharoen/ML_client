import * as THREE from 'three';
import type { Theme } from '../types';
import { chooseFollowVehicle, createTrafficFleet, trafficLength, trafficPose, type TrafficPose } from './traffic';
import { FOLLOW_LOOKAHEAD, followFraming, sceneBudget, VehicleCamera, type FollowInput } from './vehicleCamera';

export interface CityController {
	setTheme: (theme: Theme) => void;
	setReducedMotion: (reduced: boolean) => void;
	dispose: () => void;
}

type Instance = {
	position: [number, number, number];
	scale: [number, number, number];
	rotation?: [number, number, number];
	color?: number;
};

export function createCity(
	canvas: HTMLCanvasElement,
	theme: Theme,
	onFailure: (message: string) => void,
	onFirstFrame?: () => void
): CityController {
	const coarsePointer = matchMedia('(pointer: coarse)').matches;
	const device = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
	const budget = sceneBudget(window.innerWidth, navigator.hardwareConcurrency || 4, device.deviceMemory, device.connection?.saveData);
	const mobile = window.innerWidth <= 640 || (coarsePointer && window.innerWidth <= 900);
	const tablet = !mobile && window.innerWidth <= 1100;
	const quality = mobile ? 'mobile' : tablet ? 'tablet' : 'desktop';
	canvas.dataset.sceneQuality = quality;
	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: !budget.low,
		alpha: false,
		powerPreference: 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget.pixelRatio));
	renderer.shadowMap.enabled = false;
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
	const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
	const markingGeometry = new THREE.PlaneGeometry(1, 1);
	markingGeometry.rotateX(-Math.PI / 2);
	const facadeGeometry = new THREE.PlaneGeometry(1, 1);
	const geometries = new Set<THREE.BufferGeometry>([boxGeometry, markingGeometry, facadeGeometry]);
	const materials = new Set<THREE.Material>();
	const matrixHelper = new THREE.Object3D();
	const tint = new THREE.Color();

	function material(color: number, roughness = 0.9) {
		const result = new THREE.MeshStandardMaterial({ color, roughness });
		materials.add(result);
		return result;
	}

	function addInstances(
		entries: Instance[],
		geometry: THREE.BufferGeometry,
		mat: THREE.Material,
		castShadow = false
	) {
		if (entries.length === 0) return undefined;
		const mesh = new THREE.InstancedMesh(geometry, mat, entries.length);
		mesh.castShadow = castShadow;
		mesh.receiveShadow = false;
		entries.forEach((entry, index) => {
			matrixHelper.position.set(...entry.position);
			matrixHelper.scale.set(...entry.scale);
			matrixHelper.rotation.set(...(entry.rotation ?? [0, 0, 0]));
			matrixHelper.updateMatrix();
			mesh.setMatrixAt(index, matrixHelper.matrix);
			if (entry.color !== undefined) mesh.setColorAt(index, tint.setHex(entry.color));
		});
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		scene.add(mesh);
		return mesh;
	}

	function setInstance(
		mesh: THREE.InstancedMesh | undefined,
		index: number,
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		depth: number,
		rotationY = 0,
		rotationX = 0,
		rotationZ = 0
	) {
		if (!mesh) return;
		matrixHelper.position.set(x, y, z);
		matrixHelper.scale.set(width, height, depth);
		matrixHelper.rotation.set(rotationX, rotationY, rotationZ);
		matrixHelper.updateMatrix();
		mesh.setMatrixAt(index, matrixHelper.matrix);
	}

	function setLocalInstance(
		mesh: THREE.InstancedMesh | undefined,
		index: number,
		pose: TrafficPose,
		sin: number,
		cos: number,
		localX: number,
		y: number,
		localZ: number,
		scale: [number, number, number],
		pitch = 0
	) {
		setInstance(
			mesh,
			index,
			pose.x + localX * cos + localZ * sin,
			y,
			pose.z - localX * sin + localZ * cos,
			...scale,
			pose.heading,
			pitch
		);
	}

	const groundMat = material(0x373b3e);
	const roadMat = material(0x22272a);
	const sidewalkMat = material(0x727875);
	const buildingMats = [
		material(0x929997),
		material(0x858b88),
		material(0xa19f94),
		material(0x777e7b)
	];
	const roofMat = material(0x676e6b);
	const windowMat = material(0x3b484b, 0.55);
	windowMat.side = THREE.DoubleSide;
	const waterMat = material(0x304449, 0.92);
	const markingMat = material(0xc6c8ba);
	const treeMat = material(0x56645a);
	const trunkMat = material(0x55534c);
	const vehicleMat = material(0xb7b9b1, 0.65);
	const glassMat = material(0x3b484b, 0.5);
	const rubberMat = material(0x171b1c);
	const redMat = material(0x91493f, 0.45);
	const amberMat = material(0x968356, 0.45);
	const greenLightMat = material(0x596b59, 0.45);
	const vehicleLightMat = material(0xd9d2ad, 0.4);
	const pedestrianMat = material(0x626866, 0.82);
	const skinMat = material(0xaa8d78, 0.9);
	const petMat = material(0x665e55, 0.92);
	for (const [mat, glow] of [
		[redMat, 0x48211b],
		[amberMat, 0x4a3920],
		[greenLightMat, 0x263d29]
	] as const) {
		(mat as THREE.MeshStandardMaterial).emissive.setHex(glow);
	}

	const hemi = new THREE.HemisphereLight(0xe2edf1, 0x535953, 2.1);
	scene.add(hemi);
	const sun = new THREE.DirectionalLight(0xffebce, 2.4);
	sun.position.set(-45, 90, 30);
	scene.add(sun);

	const ground = new THREE.Mesh(boxGeometry, groundMat);
	ground.position.set(0, -0.8, 0);
	ground.scale.set(230, 1.5, 230);
	ground.receiveShadow = false;
	scene.add(ground);

	const roadXs = [-90, -60, -30, 0, 30, 60, 90];
	const roadZs = [-90, -60, -30, 0, 30, 60, 90];
	const roadInstances: Instance[] = [];
	const sidewalkInstances: Instance[] = [];
	const roadStart = -98;
	const roadEnd = 98;

	function addVerticalSegments(
		entries: Instance[],
		x: number,
		y: number,
		width: number,
		intersections: number[],
		intersectionHalfWidth: number,
		height = 0.12
	) {
		let start = roadStart;
		for (const z of intersections) {
			const end = z - intersectionHalfWidth;
			if (end > start) {
				entries.push({
					position: [x, y, (start + end) / 2],
					scale: [width, height, end - start]
				});
			}
			start = z + intersectionHalfWidth;
		}
		if (start < roadEnd) {
			entries.push({
				position: [x, y, (start + roadEnd) / 2],
				scale: [width, height, roadEnd - start]
			});
		}
	}

	for (const x of roadXs) {
		addVerticalSegments(roadInstances, x, 0.02, 7, roadZs, 3.5);
		for (const side of [-1, 1]) {
			addVerticalSegments(sidewalkInstances, x + side * 4.6, 0.04, 2.2, roadZs, 5.7, 0.18);
		}
	}

	function addHorizontalSegments(
		entries: Instance[],
		z: number,
		y: number,
		depth: number,
		intersections: number[],
		intersectionHalfWidth: number
	) {
		let start = roadStart;
		for (const x of intersections) {
			const end = x - intersectionHalfWidth;
			if (end > start) {
				entries.push({
					position: [(start + end) / 2, y, z],
					scale: [end - start, 0.18, depth]
				});
			}
			start = x + intersectionHalfWidth;
		}
		if (start < roadEnd) {
			entries.push({
				position: [(start + roadEnd) / 2, y, z],
				scale: [roadEnd - start, 0.18, depth]
			});
		}
	}

	for (const z of roadZs) {
		roadInstances.push({ position: [0, 0.02, z], scale: [196, 0.12, 7] });
		for (const side of [-1, 1]) {
			addHorizontalSegments(sidewalkInstances, z + side * 4.6, 0.04, 2.2, roadXs, 5.7);
		}
	}
	for (const x of roadXs) {
		for (const z of roadZs) {
			for (const sideX of [-1, 1]) {
				for (const sideZ of [-1, 1]) {
					sidewalkInstances.push({
						position: [x + sideX * 4.6, 0.04, z + sideZ * 4.6],
						scale: [2.2, 0.18, 2.2]
					});
				}
			}
		}
	}
	addInstances(roadInstances, boxGeometry, roadMat);
	addInstances(sidewalkInstances, boxGeometry, sidewalkMat);

	const markings: Instance[] = [];
	for (const z of roadZs) {
		for (let x = -96; x <= 96; x += 8) {
			if (roadXs.some((lane) => Math.abs(x - lane) < 9)) continue;
			markings.push({ position: [x, 0.1, z], scale: [2.6, 0.025, 0.12] });
		}
	}
	for (const x of roadXs) {
		for (let z = -96; z <= 96; z += 8) {
			if (roadZs.some((lane) => Math.abs(z - lane) < 9)) continue;
			markings.push({ position: [x, 0.1, z], scale: [0.12, 0.025, 2.6] });
		}
	}
	for (const x of roadXs) {
		for (const z of roadZs) {
			for (const side of [-1, 1]) {
				for (const stripe of [-3, -2, -1, 0, 1, 2, 3]) {
					markings.push(
						{ position: [x + stripe, 0.1, z + side * 6.5], scale: [0.5, 0.025, 2] },
						{ position: [x + side * 6.5, 0.1, z + stripe], scale: [2, 0.025, 0.5] }
					);
				}
			}
		}
	}

	const buildingEntries = buildingMats.map(() => [] as Instance[]);
	const flatRoofEntries: Instance[] = [];
	const windowEntries: Instance[] = [];
	const centersX = [-75, -45, -15, 15, 45, 75];
	const centersZ = [-75, -45, -15, 15, 45, 75];
	const buildingBounds: THREE.Box3[] = [];
	for (let row = 0; row < centersZ.length; row++) {
		for (let column = 0; column < centersX.length; column++) {
			const blockX = centersX[column];
			const blockZ = centersZ[row];
			for (let plot = 0; plot < 2; plot++) {
				const seed = (row * 53 + column * 29 + plot * 17) % 97;
				// Keep every footprint behind the outer sidewalk edge at 5.7 units from a road.
				const x = blockX + (plot === 0 ? -5.8 : 5.8);
				const z = blockZ + (plot === 0 ? -5.2 : 5.2);
				const style = seed % buildingMats.length;
				const width = 6.8 + (seed % 4) * 0.38;
				const depth = 6.5 + (seed % 3) * 0.42;
				const height = 12 + (seed % 23) * 1.25;
				const baseY = -0.04;
				const tiered = style !== 3;
				const lowerHeight = tiered ? height * ([0.38, 0.55, 0.46][style] + (seed % 3) * 0.06) : height;
				const upperWidth = width * ([0.72, 0.6, 0.48, 1][style] + (seed % 2) * 0.06);
				const upperDepth = depth * ([0.62, 0.72, 0.5, 1][style] + (seed % 3) * 0.04);
				const upperX = x + (tiered ? ((seed % 3) - 1) * (style === 2 ? 0.65 : 0.35) : 0);
				const upperZ = z + (tiered ? (((seed + 1) % 3) - 1) * (style === 1 ? 0.55 : 0.25) : 0);
				buildingBounds.push(new THREE.Box3(
					new THREE.Vector3(x - width / 2 - 0.35, baseY, z - depth / 2 - 0.35),
					new THREE.Vector3(x + width / 2 + 0.35, baseY + height + 0.65, z + depth / 2 + 0.35)
				));
				buildingEntries[style].push({
					position: [x, baseY + lowerHeight / 2, z],
					scale: [width, lowerHeight, depth]
				});
				if (tiered) buildingEntries[style].push({
					position: [upperX, baseY + lowerHeight + (height - lowerHeight) / 2, upperZ],
					scale: [upperWidth, height - lowerHeight, upperDepth]
				});
				// Four-sided piers keep even the low tier readable as architecture rather than blank boxes.
				for (const offset of [-1, 1]) {
					buildingEntries[style].push(
						{ position: [x + offset * width / 6, baseY + lowerHeight / 2, z + depth / 2 + 0.065], scale: [0.13, lowerHeight * 0.94, 0.1] },
						{ position: [x + offset * width / 6, baseY + lowerHeight / 2, z - depth / 2 - 0.065], scale: [0.13, lowerHeight * 0.94, 0.1] },
						{ position: [x + width / 2 + 0.065, baseY + lowerHeight / 2, z + offset * depth / 6], scale: [0.1, lowerHeight * 0.94, 0.13] },
						{ position: [x - width / 2 - 0.065, baseY + lowerHeight / 2, z + offset * depth / 6], scale: [0.1, lowerHeight * 0.94, 0.13] }
					);
				}
				flatRoofEntries.push({
					position: [tiered ? upperX : x, baseY + height + 0.18, tiered ? upperZ : z],
					scale: [tiered ? upperWidth * 0.88 : width * 0.88, 0.36, tiered ? upperDepth * 0.88 : depth * 0.88]
				});
				{
					const topWidth = tiered ? upperWidth : width;
					const topDepth = tiered ? upperDepth : depth;
					const corniceY = baseY + (tiered ? lowerHeight : height) - 0.16;
					flatRoofEntries.push(
						{ position: [x, corniceY, z + (tiered ? depth : topDepth) / 2 + 0.08], scale: [(tiered ? width : topWidth) + 0.18, 0.22, 0.14] },
						{ position: [x, corniceY, z - (tiered ? depth : topDepth) / 2 - 0.08], scale: [(tiered ? width : topWidth) + 0.18, 0.22, 0.14] },
						{ position: [x + (tiered ? width : topWidth) / 2 + 0.08, corniceY, z], scale: [0.14, 0.22, (tiered ? depth : topDepth) + 0.18] },
						{ position: [x - (tiered ? width : topWidth) / 2 - 0.08, corniceY, z], scale: [0.14, 0.22, (tiered ? depth : topDepth) + 0.18] },
						{ position: [upperX, baseY + height + 0.48, upperZ + topDepth / 2 - 0.09], scale: [topWidth, 0.42, 0.16] },
						{ position: [upperX, baseY + height + 0.48, upperZ - topDepth / 2 + 0.09], scale: [topWidth, 0.42, 0.16] },
						{ position: [upperX + topWidth / 2 - 0.09, baseY + height + 0.48, upperZ], scale: [0.16, 0.42, topDepth] },
						{ position: [upperX - topWidth / 2 + 0.09, baseY + height + 0.48, upperZ], scale: [0.16, 0.42, topDepth] }
					);
					const entranceSide = plot === 0 ? -1 : 1;
					windowEntries.push({
						position: [x + ((seed % 3) - 1) * 0.7, 1.15, z + entranceSide * (depth / 2 + 0.08)],
						scale: [Math.min(1.3, width * 0.22), 2.05, 1],
						rotation: [0, entranceSide < 0 ? Math.PI : 0, 0]
					});
				}
				if (seed % 3 === 0) flatRoofEntries.push({
					position: [(tiered ? upperX : x) + (seed % 2 ? 0.45 : -0.45), baseY + height + 0.65, tiered ? upperZ : z],
					scale: [Math.min(2.2, width * 0.32), 0.9, Math.min(1.8, depth * 0.3)]
				});
				const floors = Math.max(2, Math.floor(height / (mobile || budget.low ? 4.8 : 3.5)));
				for (let floor = 0; floor < floors; floor++) {
					const floorY = baseY + 1.2 + floor * (height / floors);
					const upperFloor = tiered && floorY > lowerHeight;
					const facadeX = upperFloor ? upperX : x;
					const facadeZ = upperFloor ? upperZ : z;
					const facadeWidth = upperFloor ? upperWidth : width;
					const facadeDepth = upperFloor ? upperDepth : depth;
					const bays = budget.low ? 2 : [2, 3, 4, 3][style];
					const windowHeight = seed % 5 ? 0.64 : 0.88;
					for (let bay = 0; bay < bays; bay++) {
						const ratio = (bay + 1) / (bays + 1) - 0.5;
						const bayWidth = facadeWidth / (bays + 0.75);
						const bayDepth = facadeDepth / (bays + 0.75);
						windowEntries.push(
							{ position: [facadeX + ratio * facadeWidth, floorY, facadeZ + facadeDepth / 2 + 0.06], scale: [bayWidth * 0.72, windowHeight, 1] },
							{ position: [facadeX - ratio * facadeWidth, floorY, facadeZ - facadeDepth / 2 - 0.06], scale: [bayWidth * 0.72, windowHeight, 1], rotation: [0, Math.PI, 0] },
							{ position: [facadeX + facadeWidth / 2 + 0.06, floorY, facadeZ + ratio * facadeDepth], scale: [bayDepth * 0.72, windowHeight, 1], rotation: [0, Math.PI / 2, 0] },
							{ position: [facadeX - facadeWidth / 2 - 0.06, floorY, facadeZ - ratio * facadeDepth], scale: [bayDepth * 0.72, windowHeight, 1], rotation: [0, -Math.PI / 2, 0] }
						);
					}
				}
			}
		}
	}
	buildingEntries.forEach((entries, style) => {
		addInstances(entries, boxGeometry, buildingMats[style]);
	});
	canvas.dataset.buildingCount = String(centersX.length * centersZ.length * 2);
	canvas.dataset.buildingMassCount = String(buildingEntries.reduce((count, entries) => count + entries.length, 0));

	const treeGeometry = new THREE.DodecahedronGeometry(1, 0);
	geometries.add(treeGeometry);
	const trunks: Instance[] = [];
	const crowns: Instance[] = [];
	const treeCount = budget.low ? 16 : mobile ? 18 : tablet ? 24 : 30;
	for (let index = 0; index < treeCount; index++) {
		const avenue = index % 3 === 0;
		const step = Math.floor(index / 3);
		const x = avenue ? -96 + (step % 10) * 20.5 : centersX[(index * 5) % centersX.length] + (index % 2 ? 10.1 : -10.1);
		const z = avenue ? 103 : centersZ[(index * 7) % centersZ.length] + (index % 4 < 2 ? 10.2 : -10.2);
		const height = 1.35 + (index % 5) * 0.13;
		const spread = 0.72 + (index % 4) * 0.1;
		trunks.push({ position: [x, height / 2, z], scale: [0.14 + (index % 3) * 0.025, height, 0.14 + (index % 3) * 0.025] });
		crowns.push({
			position: [x, height + 0.92 + (index % 2) * 0.18, z],
			scale: [spread, 0.95 + (index % 3) * 0.22, spread * (0.9 + (index % 2) * 0.18)],
			rotation: [0, (index * 1.7) % Math.PI, 0],
			color: index % 3 === 0 ? 0x607061 : index % 3 === 1 ? 0x526258 : 0x59695b
		});
	}
	addInstances(trunks, boxGeometry, trunkMat);
	addInstances(crowns, treeGeometry, treeMat);

	addInstances(
		[
			{ position: [0, 0.04, 119], scale: [230, 0.18, 8] },
			{ position: [0, -0.055, 141], scale: [300, 0.04, 36] }
		],
		boxGeometry,
		waterMat
	);
	const farLandMat = material(0x8a8e84);
	addInstances(
		[{ position: [0, -0.1, 166], scale: [150, 1.2, 14] }],
		boxGeometry,
		farLandMat
	);
	const bridgeMat = material(0x777a73);
	const bridgeZ = 141;
	addInstances(
		[
			{ position: [0, 0.34, bridgeZ], scale: [4.8, 0.36, 36] },
			{ position: [0, -0.38, bridgeZ - 10], scale: [0.75, 0.9, 0.75] },
			{ position: [0, -0.38, bridgeZ + 10], scale: [0.75, 0.9, 0.75] },
			{ position: [-2.25, 0.72, bridgeZ], scale: [0.16, 0.36, 36] },
			{ position: [2.25, 0.72, bridgeZ], scale: [0.16, 0.36, 36] }
		],
		boxGeometry,
		bridgeMat
	);

	const towerPosition = new THREE.Group();
	towerPosition.position.set(-50, 0, 99);
	towerPosition.scale.setScalar(1.95);
	scene.add(towerPosition);
	const cnShaft = new THREE.CylinderGeometry(0.55, 1.45, 39, 8);
	const cnDeck = new THREE.CylinderGeometry(3.25, 2.7, 1.8, 12);
	const cnUpperDeck = new THREE.CylinderGeometry(1.5, 1.1, 1.8, 10);
	const cnAntenna = new THREE.CylinderGeometry(0.09, 0.18, 12, 6);
	geometries.add(cnShaft);
	geometries.add(cnDeck);
	geometries.add(cnUpperDeck);
	geometries.add(cnAntenna);
	const towerShaft = new THREE.Mesh(cnShaft, buildingMats[1]);
	towerShaft.position.y = 19.5;
	towerPosition.add(towerShaft);
	const observationDeck = new THREE.Mesh(cnDeck, roofMat);
	observationDeck.position.y = 31;
	towerPosition.add(observationDeck);
	const upperDeck = new THREE.Mesh(cnUpperDeck, buildingMats[1]);
	upperDeck.position.y = 32.6;
	towerPosition.add(upperDeck);
	const antenna = new THREE.Mesh(cnAntenna, buildingMats[1]);
	antenna.position.y = 39.5;
	towerPosition.add(antenna);

	const signalPosts: Instance[] = [];
	const redLights: Instance[] = [];
	const amberLights: Instance[] = [];
	const greenLights: Instance[] = [];
	const streetFurniture: Instance[] = [];
	const signPanels: Instance[] = [];
	const streetLamps: Instance[] = [];
	// Signals are cheap static instances and are essential intersection landmarks on every tier.
	const signalStride = 1;
	for (let row = 0; row < roadZs.length; row += signalStride) {
		for (let column = 0; column < roadXs.length; column += signalStride) {
			const intersectionX = roadXs[column];
			const intersectionZ = roadZs[row];
			for (const [sideX, sideZ] of [[1, -1], [-1, 1]] as const) {
				const x = intersectionX + sideX * 4.45;
				const z = intersectionZ + sideZ * 4.45;
				signalPosts.push(
					{ position: [x, 1.75, z], scale: [0.12, 3.5, 0.12] },
					{ position: [x, 3.38, z], scale: [0.52, 1.02, 0.34] },
					{ position: [x + sideX * 0.24, 2.1, z], scale: [0.36, 0.48, 0.28] }
				);
				redLights.push(
					{ position: [x, 3.7, z - sideZ * 0.18], scale: [0.16, 0.16, 0.07] },
					{ position: [x + sideX * 0.24, 2.21, z - sideZ * 0.15], scale: [0.1, 0.1, 0.05] }
				);
				amberLights.push({ position: [x, 3.4, z - sideZ * 0.18], scale: [0.16, 0.16, 0.07] });
				greenLights.push(
					{ position: [x, 3.1, z - sideZ * 0.18], scale: [0.16, 0.16, 0.07] },
					{ position: [x + sideX * 0.24, 2.02, z - sideZ * 0.15], scale: [0.1, 0.1, 0.05] }
				);
			}
			// Stop bars, compact street-name signs and a lamp at every rendered intersection.
			markings.push(
				{ position: [intersectionX, 0.105, intersectionZ - 7.7], scale: [6.2, 0.025, 0.28] },
				{ position: [intersectionX + 7.7, 0.105, intersectionZ], scale: [0.28, 0.025, 6.2] }
			);
			const lampX = intersectionX - 4.7;
			const lampZ = intersectionZ - 4.7;
			streetFurniture.push(
				{ position: [lampX, 2.55, lampZ], scale: [0.1, 5.1, 0.1] },
				{ position: [lampX + 0.42, 4.98, lampZ], scale: [0.85, 0.09, 0.09] },
				{ position: [lampX, 2.05, lampZ + 0.18], scale: [0.08, 4.1, 0.08] }
			);
			streetLamps.push({ position: [lampX + 0.82, 4.91, lampZ], scale: [0.28, 0.12, 0.2] });
			signPanels.push({ position: [lampX + 0.22, 3.62, lampZ], scale: [0.82, 0.34, 0.08] });
		}
	}
	// Benches, litter bins and bollards sit in the setback zone between lots and sidewalks.
	const furnitureCount = budget.low ? 10 : mobile ? 16 : 28;
	for (let index = 0; index < furnitureCount; index++) {
		const blockX = centersX[(index * 5) % centersX.length];
		const blockZ = centersZ[(index * 7) % centersZ.length];
		const x = blockX + (index % 2 ? 10 : -10);
		const z = blockZ + (index % 4 < 2 ? 9.7 : -9.7);
		if (index % 3 === 0) {
			streetFurniture.push(
				{ position: [x, 0.48, z], scale: [1.35, 0.14, 0.42] },
				{ position: [x, 0.82, z + 0.18], scale: [1.35, 0.58, 0.12] },
				{ position: [x - 0.52, 0.24, z], scale: [0.1, 0.48, 0.1] },
				{ position: [x + 0.52, 0.24, z], scale: [0.1, 0.48, 0.1] }
			);
		} else if (index % 3 === 1) {
			streetFurniture.push({ position: [x, 0.45, z], scale: [0.46, 0.9, 0.46] });
		} else {
			for (const offset of [-0.65, 0, 0.65]) streetFurniture.push({ position: [x + offset, 0.38, z], scale: [0.1, 0.76, 0.1] });
		}
	}
	addInstances([...signalPosts, ...streetFurniture, ...signPanels], boxGeometry, rubberMat);
	addInstances(markings, markingGeometry, markingMat);
	addInstances(streetLamps, boxGeometry, vehicleLightMat);
	const redMesh = addInstances(redLights, boxGeometry, redMat);
	const amberMesh = addInstances(amberLights, boxGeometry, amberMat);
	const greenMesh = addInstances(greenLights, boxGeometry, greenLightMat);

	const vehicleCount = budget.vehicles;
	canvas.dataset.vehicleCount = String(vehicleCount);
	canvas.dataset.performanceTier = budget.low ? 'low' : 'standard';
	const vehicleBodies: Instance[] = [];
	const vehicleCabins: Instance[] = [];
	const vehicleWindows: Instance[] = [];
	const vehicleLights: Instance[] = [];
	const vehicleDetails: Instance[] = [];
	const vehicleDetailRanges: { start: number; count: number }[] = [];
	const vehicles = createTrafficFleet(vehicleCount);
	const bodyGeometry = boxGeometry;
	const tireGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.18, 6);
	tireGeometry.rotateZ(Math.PI / 2);
	geometries.add(tireGeometry);
	const vehicleTires: Instance[] = [];
	for (let index = 0; index < vehicleCount; index++) {
		const type = index % 12;
		const isBus = type === 0;
		const isVan = type === 7;
		const isTruck = type === 5;
		const length = isBus ? 5.2 : isTruck ? 4 : isVan ? 3.6 : 2.8;
		const height = isBus || isTruck ? 1.25 : 0.72;
		const xSize = isBus ? 1.65 : isTruck ? 1.45 : 1.25;
		const vehicleColor = [0xb7b9b1, 0x879497, 0xa86150, 0x8f897d, 0x687779, 0xb09b6f][type % 6];
		vehicleBodies.push({
			position: [0, 0.65, 0],
			scale: [xSize, height, length],
			color: vehicleColor
		});
		vehicleCabins.push({
			position: [0, isBus ? 1.22 : 1.08, isTruck ? -0.65 : 0.12],
			scale: [xSize * 0.84, isBus || isVan ? 0.56 : 0.44, isBus ? 3.4 : isTruck ? 1.4 : isVan ? 1.8 : 1.35],
			color: vehicleColor
		});
		vehicleWindows.push({
			position: [0, isBus ? 1.23 : 1.08, isTruck ? -0.65 : 0.12],
			scale: [xSize * 0.86, 0.25, isBus ? 3.35 : isTruck ? 0.9 : isVan ? 1.7 : 1.25]
		});
		vehicleTires.push(
			{ position: [-xSize * 0.53, 0.3, -length * 0.3], scale: [0.23, 0.18, 0.43] },
			{ position: [xSize * 0.53, 0.3, -length * 0.3], scale: [0.23, 0.18, 0.43] },
			{ position: [-xSize * 0.53, 0.3, length * 0.3], scale: [0.23, 0.18, 0.43] },
			{ position: [xSize * 0.53, 0.3, length * 0.3], scale: [0.23, 0.18, 0.43] }
		);
		vehicleLights.push(
			{ position: [-xSize * 0.3, 0.68, length * 0.505], scale: [0.22, 0.16, 0.06], color: 0xd9d2ad },
			{ position: [xSize * 0.3, 0.68, length * 0.505], scale: [0.22, 0.16, 0.06], color: 0xd9d2ad },
			{ position: [-xSize * 0.3, 0.68, -length * 0.505], scale: [0.2, 0.15, 0.06], color: 0x91493f },
			{ position: [xSize * 0.3, 0.68, -length * 0.505], scale: [0.2, 0.15, 0.06], color: 0x91493f }
		);
		const detailStart = vehicleDetails.length;
		if (isBus) {
			vehicleDetails.push(
				{ position: [0, 1.58, -0.5], scale: [xSize * 0.72, 0.16, 1.05], color: vehicleColor },
				{ position: [0, 0.42, length * 0.48], scale: [xSize * 0.92, 0.18, 0.16], color: vehicleColor }
			);
		} else if (isTruck) {
			vehicleDetails.push(
				{ position: [0, 1.28, 0.78], scale: [xSize * 0.94, 1.28, 2.1], color: vehicleColor },
				{ position: [0, 0.62, -length * 0.48], scale: [xSize * 0.94, 0.2, 0.16], color: vehicleColor }
			);
		} else {
			vehicleDetails.push(
				{ position: [0, isVan ? 1.5 : 0.91, length * 0.31], scale: [xSize * 0.86, isVan ? 0.14 : 0.18, length * 0.28], color: vehicleColor },
				{ position: [0, 0.62, -length * 0.44], scale: [xSize * 0.9, 0.2, length * 0.12], color: vehicleColor }
			);
		}
		vehicleDetailRanges.push({ start: detailStart, count: vehicleDetails.length - detailStart });
	}
	const bodyMesh = addInstances(vehicleBodies, bodyGeometry, vehicleMat);
	const cabinMesh = addInstances(vehicleCabins, bodyGeometry, vehicleMat);
	const windowMesh = addInstances(vehicleWindows, bodyGeometry, glassMat);
	const tireMesh = addInstances(vehicleTires, tireGeometry, rubberMat);
	const vehicleLightMesh = addInstances(vehicleLights, boxGeometry, vehicleLightMat);
	const vehicleDetailMesh = addInstances(vehicleDetails, boxGeometry, vehicleMat);
	// Dynamic instances can travel outside their first-frame bounds.
	for (const mesh of [bodyMesh, cabinMesh, windowMesh, tireMesh, vehicleLightMesh, vehicleDetailMesh]) {
		if (mesh) {
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		}
	}

	// Pedestrians follow inset sidewalk loops, so they never enter road lanes or building lots.
	const pedestrianCount = budget.low ? 8 : mobile ? 10 : tablet ? 14 : 18;
	const pedestrianBodies: Instance[] = [];
	const pedestrianHeads: Instance[] = [];
	const pedestrianLimbs: Instance[] = [];
	const petParts: Instance[] = [];
	const leashEntries: Instance[] = [];
	const pedestrians = Array.from({ length: pedestrianCount }, (_, index) => {
		const ring = [84.4, 54.4, 24.4][index % 3];
		const reverse = index % 2 === 1;
		const height = 0.92 + (index % 5) * 0.045;
		const hasPet = index % 7 === 2;
		pedestrianBodies.push({ position: [0, 0, 0], scale: [0.34, height * 0.78, 0.25], color: index % 3 === 0 ? 0x6e7775 : index % 3 === 1 ? 0x777169 : 0x626866 });
		pedestrianHeads.push({ position: [0, 0, 0], scale: [0.22, 0.26, 0.22], color: index % 4 === 0 ? 0x8c6f5f : 0xaa8d78 });
		for (let limb = 0; limb < 4; limb++) pedestrianLimbs.push({ position: [0, 0, 0], scale: [0.11, limb < 2 ? height * 0.5 : height * 0.44, 0.11] });
		if (hasPet) {
			petParts.push(
				{ position: [0, 0, 0], scale: index % 14 === 2 ? [0.24, 0.28, 0.5] : [0.18, 0.2, 0.38] },
				{ position: [0, 0, 0], scale: index % 14 === 2 ? [0.22, 0.24, 0.22] : [0.17, 0.19, 0.17] }
			);
			leashEntries.push({ position: [0, 0, 0], scale: [0.025, 0.025, 1] });
		}
		return {
			distance: (index / pedestrianCount) * (ring * 7.2),
			speed: (0.72 + (index % 4) * 0.08) * (reverse ? -1 : 1),
			ring,
			height,
			hasPet,
			pose: { x: 0, z: 0, heading: 0 } as TrafficPose
		};
	});
	const pedestrianBodyMesh = addInstances(pedestrianBodies, boxGeometry, pedestrianMat);
	const pedestrianHeadMesh = addInstances(pedestrianHeads, boxGeometry, skinMat);
	const pedestrianLimbMesh = addInstances(pedestrianLimbs, boxGeometry, pedestrianMat);
	const petMesh = addInstances(petParts, boxGeometry, petMat);
	const leashMesh = addInstances(leashEntries, boxGeometry, petMat);
	for (const mesh of [pedestrianBodyMesh, pedestrianHeadMesh, pedestrianLimbMesh, petMesh, leashMesh]) {
		if (mesh) {
			mesh.frustumCulled = false;
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		}
	}
	canvas.dataset.pedestrianCount = String(pedestrianCount);
	canvas.dataset.petCount = String(petParts.length / 2);

	let disposed = false;
	let detailWork = 0;
	let detailWorkIsIdle = false;
	let introPaused = document.documentElement.dataset.intro !== undefined;
	let reduced = false;
	let failed = false;
	let frame = 0;
	let resumeTimer = 0;
	let last = 0;
	let clock = 0;
	let pointerX = 0.5;
	let pointerY = 0.5;
	let pointerInside = false;
	// Cursor look offsets gently swing the chase boom around the followed vehicle.
	let lookYaw = 0;
	let lookPitch = 0;
	const maxLookYaw = 0.12;
	const maxLookPitch = 0.1;
	const framingBounds = new THREE.Box3().setFromObject(scene);
	const framingSize = new THREE.Vector3();
	buildingBounds.push(new THREE.Box3().setFromObject(towerPosition));
	const followCamera = new VehicleCamera(buildingBounds);
	const followInput: FollowInput = { yawOffset: 0, pitchOffset: 0, aheadHeading: 0, snap: false };
	const aheadPose: TrafficPose = { x: 0, z: 0, heading: 0 };
	let followedVehicle = -1;
	let exploration = 0;
	let explorationUntil = 0;
	let touch: { id: number; x: number; y: number; yaw: number; horizontal: boolean } | null = null;
	const vehicleProjection = new THREE.Vector3();
	const vehicleEndProjection = new THREE.Vector3();
	let renderCount = 0;
	let renderTotalMs = 0;
	let diagnosticsAt = -Infinity;
	let cameraDistance = 0;
	let cameraInitialized = false;
	const idleWindow = window as Window & {
		requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
		cancelIdleCallback?: (handle: number) => void;
	};

	function attachArchitectureDetails() {
		detailWork = 0;
		if (disposed) return;
		addInstances(flatRoofEntries, boxGeometry, roofMat);
		addInstances(windowEntries, facadeGeometry, windowMat);
		canvas.dataset.architectureDetail = 'ready';
		// Idle work can finish while the intro intentionally pauses the animation loop.
		// Paint the newly attached facades once so they cannot remain absent until motion resumes.
		render();
	}

	waterMat.transparent = false;
	waterMat.depthTest = true;
	waterMat.depthWrite = true;

	function setTheme(value: Theme, renderScene = true) {
		const light = value === 'light';
		scene.background = new THREE.Color(light ? 0xe6e5de : 0x151a1d);
		scene.fog = new THREE.Fog(light ? 0xe6e5de : 0x151a1d, cameraDistance + 80, cameraDistance + 300);
		groundMat.color.set(light ? 0xb6bab2 : 0x373b3e);
		buildingMats[0].color.set(light ? 0xd6d6cd : 0x929997);
		buildingMats[1].color.set(light ? 0xc7c8c0 : 0x858b88);
		buildingMats[2].color.set(light ? 0xd3d0c3 : 0xa19f94);
		buildingMats[3].color.set(light ? 0xbfc3bd : 0x777e7b);
		roofMat.color.set(light ? 0x777a73 : 0x676e6b);
		windowMat.color.set(light ? 0x667477 : 0x3b484b);
		sidewalkMat.color.set(light ? 0xbfc3b7 : 0x727875);
		treeMat.color.set(light ? 0x879583 : 0x56645a);
		trunkMat.color.set(light ? 0x777064 : 0x55534c);
		waterMat.color.set(light ? 0x9caeaf : 0x304449);
		sun.intensity = light ? 2.8 : 2.1;
		if (renderScene) render();
	}

	// Each load follows a random vehicle, avoiding the one picked by the previous load.
	function selectFollowVehicle() {
		let previous = followedVehicle;
		if (previous < 0) {
			try {
				const saved = sessionStorage.getItem('toronto-city-follow');
				if (saved !== null) previous = Number(saved);
			} catch (error) {
				console.error('Unable to read the previous visual vehicle selection.', error);
			}
		}
		followedVehicle = chooseFollowVehicle(vehicleCount, previous);
		try {
			sessionStorage.setItem('toronto-city-follow', String(followedVehicle));
		} catch (error) {
			console.error('Unable to save the visual vehicle selection.', error);
		}
		canvas.dataset.followVehicle = String(followedVehicle);
		const followed = vehicles[followedVehicle];
		const roadRing = Math.round(Math.abs(followed.width) / 30) * 30;
		const sidewalkRing = Math.max(24.4, roadRing - 5.6);
		const vehicleRouteLength = trafficLength(followed.width, followed.depth);
		const progress = (((followed.distance % vehicleRouteLength) + vehicleRouteLength) % vehicleRouteLength) / vehicleRouteLength;
		const sidewalkLength = trafficLength(sidewalkRing, sidewalkRing);
		for (let index = 0; index < Math.min(3, pedestrians.length); index++) {
			pedestrians[index].ring = sidewalkRing;
			pedestrians[index].distance = progress * sidewalkLength + (index - 1) * 4.5;
		}
	}

	function updateFollowInput(dt: number, snap = false) {
		const vehicle = vehicles[followedVehicle];
		trafficPose(vehicle.distance + vehicle.speed * FOLLOW_LOOKAHEAD, vehicle.width, vehicle.depth, 3, aheadPose);
		followInput.aheadHeading = aheadPose.heading + (vehicle.speed < 0 ? Math.PI : 0);
		followInput.yawOffset = exploration + lookYaw;
		followInput.pitchOffset = lookPitch;
		followInput.snap = snap;
		followCamera.update(vehicle.pose, camera.aspect, dt, followInput);
	}

	function resize(renderScene = true) {
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		if (!width || !height) return;
		const nextBudget = sceneBudget(width, navigator.hardwareConcurrency || 4, device.deviceMemory, device.connection?.saveData);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, nextBudget.pixelRatio));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		const framing = followFraming(camera.aspect);
		camera.fov = framing.fov;
		camera.setViewOffset(width, height, -width * framing.frameShift, -height * framing.frameOffset, width, height);
		// Only the first frame snaps; later resizes (rotation, mobile URL bars) glide to the new framing.
		if (!cameraInitialized) updateFollowInput(0, true);
		cameraDistance = framing.distance;
		canvas.dataset.cameraMode = 'vehicle';
		canvas.dataset.cameraDistance = cameraDistance.toFixed(3);
		camera.near = 0.5;
		camera.far = cameraDistance + framingBounds.getSize(framingSize).length();
		camera.updateProjectionMatrix();
		if (scene.fog instanceof THREE.Fog) {
			scene.fog.near = cameraDistance + 80;
			scene.fog.far = cameraDistance + 300;
		}
		if (renderScene) render();
	}

	function pointerMove(event: PointerEvent) {
		if (event.pointerType === 'touch') {
			if (!touch || touch.id !== event.pointerId || reduced) return;
			const dx = event.clientX - touch.x;
			const dy = event.clientY - touch.y;
			if (!touch.horizontal && Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
				touch = null;
				return;
			}
			if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5) touch.horizontal = true;
			if (touch.horizontal) {
				exploration = THREE.MathUtils.clamp(touch.yaw - dx * 0.003, -0.18, 0.18);
				explorationUntil = performance.now() + 1800;
			}
			return;
		}
		if (reduced) return;
		pointerX = THREE.MathUtils.clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1);
		pointerY = THREE.MathUtils.clamp(event.clientY / Math.max(window.innerHeight, 1), 0, 1);
		pointerInside = true;
	}

	function pointerDown(event: PointerEvent) {
		if (reduced || event.pointerType !== 'touch' || !event.isPrimary) return;
		if (!(event.target instanceof Element) || !event.target.closest('.hero') ||
			event.target.closest('a, button, input, select, summary, .hero-copy')) return;
		touch = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: exploration, horizontal: false };
	}

	function pointerUp() {
		touch = null;
	}

	function pointerLeave() {
		pointerX = 0.5;
		pointerY = 0.5;
		pointerInside = false;
	}

	function updateCamera(dt: number) {
		if (!touch && performance.now() > explorationUntil) exploration *= Math.exp(-2.8 * dt);
		const ease = 1 - Math.exp(-3 * dt);
		const yawGoal = pointerInside ? (pointerX - 0.5) * 2 * maxLookYaw : 0;
		const pitchGoal = pointerInside ? (0.5 - pointerY) * 2 * maxLookPitch : 0;
		lookYaw += (yawGoal - lookYaw) * ease;
		lookPitch += (pitchGoal - lookPitch) * ease;
		if (!vehicles[followedVehicle]) selectFollowVehicle();
		updateFollowInput(dt);
	}

	function render() {
		if (disposed || failed || document.hidden) return;
		camera.position.copy(followCamera.position);
		camera.lookAt(followCamera.target);
		const renderStarted = performance.now();
		renderer.render(scene, camera);
		renderTotalMs += performance.now() - renderStarted;
		renderCount++;
		if (!cameraInitialized) {
			canvas.dataset.initialCameraPitch = followCamera.pitch.toFixed(3);
			canvas.dataset.initialCameraDistance = cameraDistance.toFixed(3);
			canvas.dataset.initialVehicleDistance = camera.position.distanceTo(followCamera.target).toFixed(3);
			cameraInitialized = true;
			onFirstFrame?.();
		}
		if (renderStarted - diagnosticsAt < 250) return;
		diagnosticsAt = renderStarted;
		canvas.dataset.renderCount = String(renderCount);
		canvas.dataset.meanRenderMs = (renderTotalMs / renderCount).toFixed(2);
		canvas.dataset.pixelRatio = String(renderer.getPixelRatio());
		canvas.dataset.cameraExploration = exploration.toFixed(3);
		canvas.dataset.cameraLookYaw = lookYaw.toFixed(3);
		canvas.dataset.cameraLookPitch = lookPitch.toFixed(3);
		const pose = vehicles[followedVehicle].pose;
		vehicleProjection.set(pose.x, 0.9, pose.z).project(camera);
		vehicleEndProjection.set(pose.x + Math.sin(pose.heading) * vehicleBodies[followedVehicle].scale[2], 0.9, pose.z + Math.cos(pose.heading) * vehicleBodies[followedVehicle].scale[2]).project(camera);
		canvas.dataset.vehicleScreenX = ((vehicleProjection.x + 1) / 2).toFixed(3);
		canvas.dataset.vehicleScreenY = ((1 - vehicleProjection.y) / 2).toFixed(3);
		canvas.dataset.vehiclePixels = (Math.hypot(
			(vehicleEndProjection.x - vehicleProjection.x) * canvas.clientWidth / 2,
			(vehicleEndProjection.y - vehicleProjection.y) * canvas.clientHeight / 2
		)).toFixed(1);
		canvas.dataset.vehicleX = pose.x.toFixed(3);
		canvas.dataset.vehicleZ = pose.z.toFixed(3);
		canvas.dataset.cameraX = camera.position.x.toFixed(3);
		canvas.dataset.cameraY = camera.position.y.toFixed(3);
		canvas.dataset.cameraZ = camera.position.z.toFixed(3);
		canvas.dataset.vehicleDistance = camera.position.distanceTo(followCamera.target).toFixed(3);
		canvas.dataset.drawCalls = String(renderer.info.render.calls);
		canvas.dataset.triangles = String(renderer.info.render.triangles);
		canvas.dataset.cameraYaw = followCamera.yaw.toFixed(3);
		canvas.dataset.cameraPitch = followCamera.pitch.toFixed(3);
	}

	function setTrafficLights(phase: number) {
		if (redMesh) redMesh.visible = phase < 3.5;
		if (amberMesh) amberMesh.visible = phase >= 3.5 && phase < 4.5;
		if (greenMesh) greenMesh.visible = phase >= 4.5;
	}

	function updateVehicles(dt: number, advance: boolean) {
		for (let index = 0; index < vehicles.length; index++) {
			const vehicle = vehicles[index];
			if (advance) vehicle.distance += vehicle.speed * dt;
			const pose = trafficPose(vehicle.distance, vehicle.width, vehicle.depth, 3, vehicle.pose);
			if (vehicle.speed < 0) pose.heading += Math.PI;
			const sin = Math.sin(pose.heading);
			const cos = Math.cos(pose.heading);

			setInstance(bodyMesh, index, pose.x, 0.65, pose.z, ...vehicleBodies[index].scale, pose.heading);
			setInstance(
				cabinMesh,
				index,
				pose.x,
				vehicleCabins[index].position[1],
				pose.z,
				...vehicleCabins[index].scale,
				pose.heading
			);
			setInstance(
				windowMesh,
				index,
				pose.x,
				vehicleWindows[index].position[1],
				pose.z,
				...vehicleWindows[index].scale,
				pose.heading
			);
			for (let wheel = 0; wheel < 4; wheel++) {
				const tire = vehicleTires[index * 4 + wheel];
				const localX = tire.position[0];
				const localZ = tire.position[2];
				const rotatedX = localX * cos + localZ * sin;
				const rotatedZ = -localX * sin + localZ * cos;
				setInstance(
					tireMesh,
					index * 4 + wheel,
					pose.x + rotatedX,
					tire.position[1],
					pose.z + rotatedZ,
					...tire.scale,
					pose.heading
				);
			}
			for (let light = 0; light < 4; light++) {
				const entry = vehicleLights[index * 4 + light];
				const localX = entry.position[0];
				const localZ = entry.position[2];
				setInstance(
					vehicleLightMesh,
					index * 4 + light,
					pose.x + localX * cos + localZ * sin,
					entry.position[1],
					pose.z - localX * sin + localZ * cos,
					...entry.scale,
					pose.heading
				);
			}
			const detailRange = vehicleDetailRanges[index];
			for (let detail = 0; detail < detailRange.count; detail++) {
				const detailIndex = detailRange.start + detail;
				const entry = vehicleDetails[detailIndex];
				setLocalInstance(
					vehicleDetailMesh,
					detailIndex,
					pose,
					sin,
					cos,
					entry.position[0],
					entry.position[1],
					entry.position[2],
					entry.scale
				);
			}
		}
		if (bodyMesh) bodyMesh.instanceMatrix.needsUpdate = true;
		if (cabinMesh) cabinMesh.instanceMatrix.needsUpdate = true;
		if (windowMesh) windowMesh.instanceMatrix.needsUpdate = true;
		if (tireMesh) tireMesh.instanceMatrix.needsUpdate = true;
		if (vehicleLightMesh) vehicleLightMesh.instanceMatrix.needsUpdate = true;
		if (vehicleDetailMesh) vehicleDetailMesh.instanceMatrix.needsUpdate = true;
	}

	function updatePedestrians(dt: number, advance: boolean) {
		let petIndex = 0;
		for (let index = 0; index < pedestrians.length; index++) {
			const pedestrian = pedestrians[index];
			if (advance) pedestrian.distance += pedestrian.speed * dt;
			const pose = trafficPose(pedestrian.distance, pedestrian.ring, pedestrian.ring, 3, pedestrian.pose);
			if (pedestrian.speed < 0) pose.heading += Math.PI;
			const sin = Math.sin(pose.heading);
			const cos = Math.cos(pose.heading);
			const stride = Math.sin(clock * 5.2 + index * 1.7) * 0.42;
			const bob = Math.abs(Math.sin(clock * 5.2 + index * 1.7)) * 0.035;
			const legLength = pedestrian.height * 0.5;
			const bodyLength = pedestrian.height * 0.78;
			setLocalInstance(pedestrianBodyMesh, index, pose, sin, cos, 0, legLength + bodyLength / 2 + bob, 0, pedestrianBodies[index].scale);
			setLocalInstance(pedestrianHeadMesh, index, pose, sin, cos, 0, legLength + bodyLength + 0.14 + bob, 0, pedestrianHeads[index].scale);
			const limbBase = index * 4;
			setLocalInstance(pedestrianLimbMesh, limbBase, pose, sin, cos, -0.12, legLength / 2, 0, pedestrianLimbs[limbBase].scale, stride);
			setLocalInstance(pedestrianLimbMesh, limbBase + 1, pose, sin, cos, 0.12, legLength / 2, 0, pedestrianLimbs[limbBase + 1].scale, -stride);
			setLocalInstance(pedestrianLimbMesh, limbBase + 2, pose, sin, cos, -0.25, legLength + bodyLength * 0.55, 0, pedestrianLimbs[limbBase + 2].scale, -stride * 0.75);
			setLocalInstance(pedestrianLimbMesh, limbBase + 3, pose, sin, cos, 0.25, legLength + bodyLength * 0.55, 0, pedestrianLimbs[limbBase + 3].scale, stride * 0.75);
			if (pedestrian.hasPet) {
				const side = index % 2 ? -0.72 : 0.72;
				setLocalInstance(petMesh, petIndex * 2, pose, sin, cos, side, 0.25, 0.42, petParts[petIndex * 2].scale);
				setLocalInstance(petMesh, petIndex * 2 + 1, pose, sin, cos, side, 0.43, 0.69, petParts[petIndex * 2 + 1].scale);
				setLocalInstance(leashMesh, petIndex, pose, sin, cos, side * 0.5, 0.67, 0.22, leashEntries[petIndex].scale, side * 0.28);
				petIndex++;
			}
		}
		for (const mesh of [pedestrianBodyMesh, pedestrianHeadMesh, pedestrianLimbMesh, petMesh, leashMesh]) {
			if (mesh) mesh.instanceMatrix.needsUpdate = true;
		}
	}

	updateVehicles(0, false);
	updatePedestrians(0, false);
	setTrafficLights(0);

	function tick(time: number) {
		frame = 0;
		if (disposed || failed || document.hidden || introPaused) return;
		if (reduced) {
			touch = null;
			exploration = 0;
			lookYaw = 0;
			lookPitch = 0;
			updateFollowInput(0, true);
			render();
			return;
		}
		if (!last) last = time - 1000 / 30;
		if (time - last < 1000 / 30) {
			frame = requestAnimationFrame(tick);
			return;
		}
		const dt = Math.min((time - last) / 1000, 0.06);
		last = time;
		clock += dt;
		const signalCycle = clock % 9;
		setTrafficLights(signalCycle);
		updateVehicles(dt, true);
		updatePedestrians(dt, true);
		updateCamera(dt);
		render();
		frame = requestAnimationFrame(tick);
	}

	function schedule() {
		cancelAnimationFrame(frame);
		frame = 0;
		last = 0;
		render();
		if (!disposed && !failed && !document.hidden && !reduced && !introPaused) frame = requestAnimationFrame(tick);
	}

	function contextLost(event: Event) {
		event.preventDefault();
		failed = true;
		cancelAnimationFrame(frame);
		console.error('The city WebGL context was lost.');
		onFailure('The 3D graphics context was interrupted. Reload to retry; all model controls remain available.');
	}

	window.addEventListener('pointermove', pointerMove, { passive: true });
	window.addEventListener('pointerdown', pointerDown, { passive: true });
	window.addEventListener('pointerup', pointerUp, { passive: true });
	window.addEventListener('pointercancel', pointerUp, { passive: true });
	window.addEventListener('pointerleave', pointerLeave);
	const onResize = () => resize();
	// Observe the canvas itself: its box can change without a window resize (e.g. the intro scrollbar gutter).
	const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
	if (resizeObserver) resizeObserver.observe(canvas);
	else window.addEventListener('resize', onResize, { passive: true });
	document.addEventListener('visibilitychange', schedule);
	const introObserver = new MutationObserver(() => {
		const state = document.documentElement.dataset.intro;
		const paused = state !== undefined;
		if (paused === introPaused) return;
		introPaused = paused;
		if (introPaused) {
			clearTimeout(resumeTimer);
			resumeTimer = 0;
			schedule();
		} else {
			// Let the revealed heading paint before software WebGL resumes background motion.
			resumeTimer = window.setTimeout(() => {
				resumeTimer = 0;
				schedule();
			}, 450);
		}
	});
	introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-intro'] });
	canvas.addEventListener('webglcontextlost', contextLost);
	selectFollowVehicle();
	resize(false);
	setTheme(theme, false);
	schedule();
	if (idleWindow.requestIdleCallback) {
		detailWorkIsIdle = true;
		detailWork = idleWindow.requestIdleCallback(attachArchitectureDetails, { timeout: 250 });
	} else {
		detailWork = window.setTimeout(attachArchitectureDetails, 0);
	}

	return {
		setTheme,
		setReducedMotion(value) {
			reduced = value;
			if (reduced) {
				pointerX = 0.5;
				pointerY = 0.5;
				pointerInside = false;
				lookYaw = 0;
				lookPitch = 0;
			}
			schedule();
		},
		dispose() {
			disposed = true;
			cancelAnimationFrame(frame);
			clearTimeout(resumeTimer);
			if (detailWork) {
				if (detailWorkIsIdle) idleWindow.cancelIdleCallback?.(detailWork);
				else clearTimeout(detailWork);
			}
			window.removeEventListener('pointermove', pointerMove);
			window.removeEventListener('pointerdown', pointerDown);
			window.removeEventListener('pointerup', pointerUp);
			window.removeEventListener('pointercancel', pointerUp);
			window.removeEventListener('pointerleave', pointerLeave);
			resizeObserver?.disconnect();
			introObserver.disconnect();
			window.removeEventListener('resize', onResize);
			document.removeEventListener('visibilitychange', schedule);
			canvas.removeEventListener('webglcontextlost', contextLost);
			geometries.forEach((geometry) => geometry.dispose());
			materials.forEach((mat) => mat.dispose());
			scene.traverse((object) => {
				if (object instanceof THREE.InstancedMesh) object.dispose();
			});
			renderer.dispose();
		}
	};
}
