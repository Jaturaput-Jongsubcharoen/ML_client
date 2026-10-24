import { featureLabels, type FeatureKey } from './features';

export type DetailField = FeatureKey | 'latitude' | 'longitude';

interface FieldDetail {
	description: string;
	meanings?: Record<string, string>;
}

const fieldDetails: Record<FeatureKey, FieldDetail> = {
	ROAD_CLASS: {
		description: 'Describes the type of road where the collision occurred.',
		meanings: {
			Collector: 'Medium-capacity road collecting traffic from local roads to arterial roads.',
			Expressway: 'High-speed, limited-access highway for fast traffic.',
			'Expressway Ramp': 'Entry or exit ramps connecting to an expressway.',
			Laneway: 'Narrow lane typically behind houses or buildings, not intended for through traffic.',
			Local: 'Roads within neighborhoods, low traffic, usually residential.',
			'Major Arterial': 'Main roads carrying large volumes of traffic through urban areas.',
			'Major Arterial ': 'Same as above (likely a duplicate with trailing space).',
			'Major Shoreline': 'Roads adjacent to lakeshores or waterfronts.',
			'Minor Arterial': 'Secondary roads connecting local roads to major arterials.',
			Other: 'Does not fit into any listed road category.',
			Pending: 'Classification is awaiting confirmation or data update.'
		}
	},
	DISTRICT: {
		description: 'Indicates which Toronto district the collision happened in.',
		meanings: {
			'Etobicoke York': 'Western region of Toronto.',
			'North York': 'Northern region of Toronto.',
			Scarborough: 'Eastern region of Toronto.',
			'Toronto and East York': 'Central and southeastern regions of Toronto.'
		}
	},
	ACCLOC: {
		description: 'Specifies where the collision occurred relative to intersections, driveways, or other landmarks.',
		meanings: {
			'At Intersection': 'Directly at a road intersection.',
			'At/Near Private Drive': 'Near or at a private driveway entrance.',
			'Intersection Related': 'Not exactly at an intersection but influenced by nearby one.',
			Laneway: 'Inside or near a laneway.',
			'Non Intersection': 'Not near any intersection.',
			Other: 'Uncategorized location.',
			'Overpass or Bridge': 'On or around a bridge or overpass.',
			'Private Driveway': 'Within a private driveway area.',
			Trail: 'On or near a walking or bike trail.',
			'Underpass or Tunnel': 'In or near an underground passage.'
		}
	},
	TRAFFCTL: {
		description: 'Indicates the type of traffic control present at the scene.',
		meanings: {
			'No Control': 'No traffic control device.',
			'Pedestrian Crossover': 'Designated pedestrian crossing zone.',
			'Police Control': 'Officer was directing traffic.',
			'School Guard': 'Crossing guard present.',
			'Stop Sign': 'Stop sign control.',
			'Streetcar (Stop for)': 'Required to stop for a streetcar.',
			'Traffic Controller': 'Electronic traffic control system (may differ from standard signals).',
			'Traffic Gate': 'Barrier gate, typically near railways or restricted areas.',
			'Traffic Signal': 'Standard traffic light.',
			'Yield Sign': 'Yield sign control present.'
		}
	},
	VISIBILITY: {
		description: 'Describes the visibility conditions at the time of the collision.',
		meanings: {
			Clear: 'Normal visibility.',
			'Drifting Snow': 'Visibility affected by wind-blown snow.',
			'Fog, Mist, Smoke, Dust': 'Obscured vision due to environmental conditions.',
			'Freezing Rain': 'Rain that freezes on contact, creating slick surfaces.',
			Other: 'Unlisted or special visibility condition.',
			Rain: 'Moderate to heavy rainfall affecting vision.',
			Snow: 'Falling snow reducing visibility.',
			'Strong wind': 'High wind conditions affecting driving.'
		}
	},
	LIGHT: {
		description: 'Describes the lighting conditions when the collision occurred.',
		meanings: {
			Dark: 'Nighttime with no artificial lighting.',
			'Dark, artificial': 'Nighttime with street lights or other lighting.',
			Dawn: 'Before sunrise with natural lighting starting.',
			'Dawn, artificial': 'Early morning with street lighting.',
			Daylight: 'Full daylight conditions.',
			'Daylight, artificial': 'Daytime with additional artificial lighting.',
			Dusk: 'Just before darkness falls.',
			'Dusk, artificial': 'Evening time with street lighting.',
			Other: 'Lighting not classified by standard types.'
		}
	},
	RDSFCOND: {
		description: 'Describes the road surface condition.',
		meanings: {
			Dry: 'No moisture or debris.',
			Ice: 'Frozen water on road surface.',
			'Loose Sand or Gravel': 'Debris affecting tire grip.',
			'Loose Snow': 'Snow not yet packed down.',
			Other: 'Special condition not listed.',
			'Packed Snow': 'Snow pressed down by traffic.',
			Slush: 'Wet, semi-melted snow.',
			'Spilled liquid': 'Oil or other spilled substances.',
			Wet: 'Rainwater or moisture on the surface.'
		}
	},
	IMPACTYPE: {
		description: 'Indicates the type of collision impact.',
		meanings: {
			Angle: 'Vehicles collided at an angle (T-bone).',
			Approaching: 'Head-on type impact.',
			'Cyclist Collisions': 'Involving bicycles.',
			Other: 'Uncategorized impact type.',
			'Pedestrian Collisions': 'Vehicle struck a pedestrian.',
			'Rear End': 'One vehicle hit another from behind.',
			'SMV Other': 'Slow-moving vehicle incident, other type.',
			'SMV Unattended Vehicle': 'Collision with a parked or unattended vehicle.',
			Sideswipe: 'Vehicles grazed side-by-side.',
			'Turning Movement': 'Impact occurred during a turning action.'
		}
	},
	INVTYPE: {
		description: 'Describes the role or type of individual involved in the incident.',
		meanings: {
			Cyclist: 'Bicycle rider involved.',
			'Cyclist Passenger': 'Person riding on the back of a bicycle.',
			Driver: 'Operator of a vehicle.',
			'Driver - Not Hit': 'Driver involved but not injured or struck.',
			'In-Line Skater': 'Skater involved.',
			'Moped Driver': 'Operator of a moped.',
			'Moped Passenger': 'Riding on a moped but not driving.',
			'Motorcycle Driver': 'Operator of a motorcycle.',
			'Motorcycle Passenger': 'Passenger on a motorcycle.',
			Other: 'Unspecified individual.',
			'Other Property Owner': 'Owner of damaged property not in a vehicle.',
			Passenger: 'Vehicle occupant not driving.',
			Pedestrian: 'Person walking or running.',
			'Pedestrian - Not Hit': 'Pedestrian present but not struck.',
			'Trailer Owner': 'Owner of a towed trailer.',
			'Truck Driver': 'Operator of a truck.',
			'Vehicle Owner': 'Owner of any vehicle involved.',
			Wheelchair: 'Person using a wheelchair.',
			Witness: 'Observer to the event.'
		}
	},
	INJURY: {
		description: 'Severity level of injuries sustained.',
		meanings: {
			Fatal: 'Individual died due to the collision.',
			Major: 'Life-threatening or serious injuries.',
			Minimal: 'Very minor or no treatment required.',
			Minor: 'Non-life-threatening injuries, often treated at the scene.'
		}
	},
	INITDIR: {
		description: 'The direction of travel recorded before the incident.',
		meanings: {
			East: 'Traveling eastward.',
			North: 'Traveling northward.',
			South: 'Traveling southward.',
			Unknown: 'Direction not recorded.',
			West: 'Traveling westward.'
		}
	},
	VEHTYPE: {
		description: 'The type of vehicle involved in the collision.',
		meanings: {
			Ambulance: 'Emergency medical vehicle.',
			'Automobile, Station Wagon': 'Standard personal vehicle.',
			Bicycle: 'Non-motorized two-wheeler.',
			'Bus (Other) (Go Bus, Gray Coa': 'Long-distance or private bus.',
			'Construction Equipment': 'Bulldozer, crane, etc.',
			'Delivery Van': 'Van used for commercial delivery.',
			'Fire Vehicle': 'Fire department vehicle.',
			'Intercity Bus': 'Travel between cities.',
			Moped: 'Low-power motorized bike.',
			Motorcycle: 'Two-wheeled motor vehicle.',
			'Municipal Transit Bus (TTC)': 'City public transit bus.',
			'Off Road - 2 Wheels': 'Dirt bike or similar.',
			'Off Road - 4 Wheels': 'ATV or similar vehicle.',
			'Off Road - Other': 'Other off-road equipment.',
			Other: 'Not in standard categories.',
			'Other Emergency Vehicle': 'Police, fire, ambulance (misc).',
			'Passenger Van': 'Van designed for carrying people.',
			'Pick Up Truck': 'Small cargo truck.',
			'Police Vehicle': 'Law enforcement vehicle.',
			Rickshaw: 'Three-wheeled or pulled cart.',
			'School Bus': 'Bus used to transport students.',
			'Street Car': 'Rail-based urban transport.',
			Taxi: 'Commercial passenger vehicle.',
			'Tow Truck': 'Used to tow or recover vehicles.',
			'Truck (other)': 'Generic truck type.',
			'Truck - Car Carrier': 'Hauls multiple cars.',
			'Truck - Closed (Blazer, etc)': 'Closed cargo truck.',
			'Truck - Dump': 'Used to carry bulk material.',
			'Truck - Open': 'Open bed truck.',
			'Truck - Tank': 'Carries liquids or gases.',
			'Truck-Tractor': 'Head unit for pulling trailers.',
			Unknown: 'Vehicle type not recorded.'
		}
	},
	MANOEUVER: {
		description: 'Vehicle action during the incident.',
		meanings: {
			'Changing Lanes': 'Switching lanes.',
			Disabled: 'Stopped due to breakdown or issue.',
			'Going Ahead': 'Driving forward.',
			'Making U Turn': 'Reversing direction.',
			Merging: 'Joining into traffic lane.',
			Other: 'Action not listed.',
			Overtaking: 'Passing another vehicle.',
			Parked: 'Stationary vehicle.',
			'Pulling Away from Shoulder or Curb': 'Re-entering traffic from side.',
			'Pulling Onto Shoulder or towardCurb': 'Moving toward road edge.',
			Reversing: 'Backing up.',
			'Slowing or Stopping': 'Reducing speed or halting.',
			Stopped: 'Completely halted.',
			'Turning Left': 'Making a left turn.',
			'Turning Right': 'Making a right turn.',
			Unknown: 'Maneuver not recorded.'
		}
	},
	DRIVACT: {
		description: 'Driver action contributing to the collision.',
		meanings: {
			'Disobeyed Traffic Control': 'Ignored traffic lights/signs.',
			'Driving Properly': 'No driving fault identified.',
			'Exceeding Speed Limit': 'Driving faster than allowed.',
			'Failed to Yield Right of Way': 'Did not allow others to pass as required.',
			'Following too Close': 'Tailgating.',
			'Improper Lane Change': 'Unsafe or illegal lane switch.',
			'Improper Passing': 'Illegal or dangerous overtaking.',
			'Improper Turn': 'Unsafe or incorrect turning maneuver.',
			'Lost control': 'Driver lost control of vehicle.',
			Other: 'Other contributing action.',
			'Speed too Fast For Condition': 'Not adjusting speed to weather/road.',
			'Speed too Slow': 'Driving unusually slow, causing risk.',
			'Wrong Way on One Way Road': 'Driving opposite to permitted direction.'
		}
	},
	DRIVCOND: {
		description: 'Driver physical or mental condition.',
		meanings: {
			'Ability Impaired, Alcohol': 'Under influence of alcohol.',
			'Ability Impaired, Alcohol Over .08': 'Exceeded legal BAC limit.',
			'Ability Impaired, Drugs': 'Under influence of drugs.',
			Fatigue: 'Tired or drowsy driver.',
			'Had Been Drinking': 'Consumed alcohol but not necessarily impaired.',
			Inattentive: 'Distracted or not paying attention.',
			'Medical or Physical Disability': 'Medical condition affecting driving.',
			Normal: 'No known impairment.',
			Other: 'Unlisted condition.',
			Unknown: 'Condition not recorded.'
		}
	}
};

const coordinateDetails = {
	latitude: {
		description: 'Tells you how far north or south the collision happened on the map.',
		min: -90,
		max: 90,
		axis: 'north-south'
	},
	longitude: {
		description: 'Tells you how far east or west the collision happened on the map.',
		min: -180,
		max: 180,
		axis: 'east-west'
	}
} as const;

export function getFieldDetail(field: DetailField, value: string): {
	description: string;
	meaning: string;
} {
	if (field === 'latitude' || field === 'longitude') {
		const coordinate = coordinateDetails[field];
		const numericValue = Number(value);
		const meaning =
			value.trim() && Number.isFinite(numericValue) && numericValue >= coordinate.min && numericValue <= coordinate.max
				? `${numericValue}° on the ${coordinate.axis} axis.`
				: `Enter a value from ${coordinate.min} to ${coordinate.max} decimal degrees.`;

		return { description: coordinate.description, meaning };
	}

	const detail = fieldDetails[field];
	return {
		description: detail.description,
		meaning: detail.meanings?.[value] ?? `Recorded ${featureLabels[field].toLowerCase()} category: ${value}.`
	};
}
