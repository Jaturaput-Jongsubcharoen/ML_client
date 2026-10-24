import type { PredictionInput, PredictionPayload, ModelId } from '../types';

export const featureOptions = {
	ROAD_CLASS: [
		'Collector',
		'Expressway',
		'Expressway Ramp',
		'Laneway',
		'Local',
		'Major Arterial',
		'Major Arterial ',
		'Major Shoreline',
		'Minor Arterial',
		'Other',
		'Pending'
	],
	DISTRICT: ['Etobicoke York', 'North York', 'Scarborough', 'Toronto and East York'],
	ACCLOC: [
		'At Intersection',
		'At/Near Private Drive',
		'Intersection Related',
		'Laneway',
		'Non Intersection',
		'Other',
		'Overpass or Bridge',
		'Private Driveway',
		'Trail',
		'Underpass or Tunnel'
	],
	TRAFFCTL: [
		'No Control',
		'Pedestrian Crossover',
		'Police Control',
		'School Guard',
		'Stop Sign',
		'Streetcar (Stop for)',
		'Traffic Controller',
		'Traffic Gate',
		'Traffic Signal',
		'Yield Sign'
	],
	VISIBILITY: [
		'Clear',
		'Drifting Snow',
		'Fog, Mist, Smoke, Dust',
		'Freezing Rain',
		'Other',
		'Rain',
		'Snow',
		'Strong wind'
	],
	LIGHT: [
		'Dark',
		'Dark, artificial',
		'Dawn',
		'Dawn, artificial',
		'Daylight',
		'Daylight, artificial',
		'Dusk',
		'Dusk, artificial',
		'Other'
	],
	RDSFCOND: [
		'Dry',
		'Ice',
		'Loose Sand or Gravel',
		'Loose Snow',
		'Other',
		'Packed Snow',
		'Slush',
		'Spilled liquid',
		'Wet'
	],
	IMPACTYPE: [
		'Angle',
		'Approaching',
		'Cyclist Collisions',
		'Other',
		'Pedestrian Collisions',
		'Rear End',
		'SMV Other',
		'SMV Unattended Vehicle',
		'Sideswipe',
		'Turning Movement'
	],
	INVTYPE: [
		'Cyclist',
		'Cyclist Passenger',
		'Driver',
		'Driver - Not Hit',
		'In-Line Skater',
		'Moped Driver',
		'Moped Passenger',
		'Motorcycle Driver',
		'Motorcycle Passenger',
		'Other',
		'Other Property Owner',
		'Passenger',
		'Pedestrian',
		'Pedestrian - Not Hit',
		'Trailer Owner',
		'Truck Driver',
		'Vehicle Owner',
		'Wheelchair',
		'Witness'
	],
	INJURY: ['Fatal', 'Major', 'Minimal', 'Minor'],
	INITDIR: ['East', 'North', 'South', 'Unknown', 'West'],
	VEHTYPE: [
		'Ambulance',
		'Automobile, Station Wagon',
		'Bicycle',
		'Bus (Other) (Go Bus, Gray Coa',
		'Construction Equipment',
		'Delivery Van',
		'Fire Vehicle',
		'Intercity Bus',
		'Moped',
		'Motorcycle',
		'Municipal Transit Bus (TTC)',
		'Off Road - 2 Wheels',
		'Off Road - 4 Wheels',
		'Off Road - Other',
		'Other',
		'Other Emergency Vehicle',
		'Passenger Van',
		'Pick Up Truck',
		'Police Vehicle',
		'Rickshaw',
		'School Bus',
		'Street Car',
		'Taxi',
		'Tow Truck',
		'Truck (other)',
		'Truck - Car Carrier',
		'Truck - Closed (Blazer, etc)',
		'Truck - Dump',
		'Truck - Open',
		'Truck - Tank',
		'Truck-Tractor',
		'Unknown'
	],
	MANOEUVER: [
		'Changing Lanes',
		'Disabled',
		'Going Ahead',
		'Making U Turn',
		'Merging',
		'Other',
		'Overtaking',
		'Parked',
		'Pulling Away from Shoulder or Curb',
		'Pulling Onto Shoulder or towardCurb',
		'Reversing',
		'Slowing or Stopping',
		'Stopped',
		'Turning Left',
		'Turning Right',
		'Unknown'
	],
	DRIVACT: [
		'Disobeyed Traffic Control',
		'Driving Properly',
		'Exceeding Speed Limit',
		'Failed to Yield Right of Way',
		'Following too Close',
		'Improper Lane Change',
		'Improper Passing',
		'Improper Turn',
		'Lost control',
		'Other',
		'Speed too Fast For Condition',
		'Speed too Slow',
		'Wrong Way on One Way Road'
	],
	DRIVCOND: [
		'Ability Impaired, Alcohol',
		'Ability Impaired, Alcohol Over .08',
		'Ability Impaired, Drugs',
		'Fatigue',
		'Had Been Drinking',
		'Inattentive',
		'Medical or Physical Disability',
		'Normal',
		'Other',
		'Unknown'
	]
} as const;

export type FeatureKey = keyof typeof featureOptions;

export const featureLabels: Record<FeatureKey, string> = {
	ROAD_CLASS: 'Road class',
	DISTRICT: 'Toronto district',
	ACCLOC: 'Collision location',
	TRAFFCTL: 'Traffic control',
	VISIBILITY: 'Visibility',
	LIGHT: 'Lighting',
	RDSFCOND: 'Road surface',
	IMPACTYPE: 'Impact type',
	INVTYPE: 'Involved person',
	INJURY: 'Recorded injury severity',
	INITDIR: 'Initial direction',
	VEHTYPE: 'Vehicle type',
	MANOEUVER: 'Vehicle manoeuvre',
	DRIVACT: 'Driver action',
	DRIVCOND: 'Driver condition'
};

export const featureGroups: {
	label: string;
	description: string;
	fields: FeatureKey[];
}[] = [
	{
		label: 'Road & location',
		description: 'Where and how the roadway was controlled.',
		fields: ['ROAD_CLASS', 'DISTRICT', 'ACCLOC', 'TRAFFCTL']
	},
	{
		label: 'Environment',
		description: 'Conditions recorded at the time of the collision.',
		fields: ['VISIBILITY', 'LIGHT', 'RDSFCOND']
	},
	{
		label: 'Collision & involved people',
		description: 'The recorded impact, participant, and injury categories.',
		fields: ['IMPACTYPE', 'INVTYPE', 'INJURY', 'INITDIR', 'VEHTYPE', 'MANOEUVER']
	},
	{
		label: 'Driver-related',
		description: 'Recorded driver action and condition categories.',
		fields: ['DRIVACT', 'DRIVCOND']
	}
];

export function createDefaultInputs(): PredictionInput {
	const categorical = Object.fromEntries(
		Object.entries(featureOptions).map(([key, options]) => [key, options[0]])
	);

	return {
		categorical: categorical as Record<FeatureKey, string>,
		latitude: '43.7',
		longitude: '-79.4'
	};
}

export function formatFeatureOption(field: FeatureKey, value: string): string {
	if (field === 'ROAD_CLASS' && value === 'Major Arterial ') {
		return 'Major Arterial (legacy encoded value)';
	}
	if (field === 'VEHTYPE' && value === 'Bus (Other) (Go Bus, Gray Coa') {
		return 'Bus (Other)';
	}
	return value;
}

export function validatePredictionInput(input: PredictionInput): Record<string, string> {
	const errors: Record<string, string> = {};
	const latitude = Number(input.latitude);
	const longitude = Number(input.longitude);

	if (input.latitude.trim() === '' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
		errors.latitude = 'Enter a latitude between -90 and 90.';
	}
	if (
		input.longitude.trim() === '' ||
		!Number.isFinite(longitude) ||
		longitude < -180 ||
		longitude > 180
	) {
		errors.longitude = 'Enter a longitude between -180 and 180.';
	}

	for (const [field, options] of Object.entries(featureOptions)) {
		if (!options.some((option) => option === input.categorical[field as FeatureKey])) {
			errors[field] = `Choose a valid ${featureLabels[field as FeatureKey].toLowerCase()}.`;
		}
	}

	return errors;
}

export function buildPredictionPayload(
	model: ModelId,
	input: PredictionInput
): PredictionPayload {
	const encodedInput: Record<string, number> = {};

	for (const [field, options] of Object.entries(featureOptions)) {
		const selected = input.categorical[field as FeatureKey];
		for (const option of options) {
			encodedInput[`${field}_${option}`] = selected === option ? 1 : 0;
		}
	}

	encodedInput.LATITUDE = Number(input.latitude);
	encodedInput.LONGITUDE = Number(input.longitude);

	return { model_name: model, input: encodedInput };
}
