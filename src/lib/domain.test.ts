import { describe, expect, it } from 'vitest';
import {
	buildPredictionPayload,
	createDefaultInputs,
	featureOptions,
	validatePredictionInput
} from './data/features';

describe('prediction input mapping', () => {
	it('encodes every existing category and includes numeric Toronto coordinates', () => {
		const input = createDefaultInputs();
		const payload = buildPredictionPayload('random_forest', input);
		const expectedFeatureCount =
			Object.values(featureOptions).reduce((count, options) => count + options.length, 0) + 2;

		expect(payload.model_name).toBe('random_forest');
		expect(Object.keys(payload.input)).toHaveLength(expectedFeatureCount);
		expect(payload.input.LATITUDE).toBe(43.7);
		expect(payload.input.LONGITUDE).toBe(-79.4);
		expect(payload.input.ROAD_CLASS_Collector).toBe(1);
		expect(payload.input['ROAD_CLASS_Major Arterial ']).toBe(0);
		expect(Object.values(payload.input).every((value) => Number.isFinite(value))).toBe(true);
	});

	it('preserves the legacy trailing-space category as its own encoded field', () => {
		const input = createDefaultInputs();
		input.categorical.ROAD_CLASS = 'Major Arterial ';
		const payload = buildPredictionPayload('svm', input);

		expect(payload.input['ROAD_CLASS_Major Arterial ']).toBe(1);
		expect(payload.input['ROAD_CLASS_Major Arterial']).toBe(0);
	});

	it('rejects invalid coordinate ranges and unknown categorical choices', () => {
		const input = createDefaultInputs();
		input.latitude = '91';
		input.longitude = '';
		input.categorical.DISTRICT = 'Ottawa';

		const errors = validatePredictionInput(input);

		expect(errors.latitude).toContain('-90 and 90');
		expect(errors.longitude).toContain('-180 and 180');
		expect(errors.DISTRICT).toContain('district');
	});
});
