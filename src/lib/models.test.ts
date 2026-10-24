import { expect, it } from 'vitest';
import { modelIds, modelMetrics } from './data/models';
import { buildPredictionPayload, createDefaultInputs } from './data/features';

it('preserves every deployed model ID and every original metric value', () => {
	const expected = {
		random_forest: [0.953586, 0.896018, 0.758427, 0.821501],
		knn: [0.921414, 0.689103, 0.805243, 0.74266],
		svm: [0.837289, 0.442759, 0.601124, 0.509929],
		neural_network: [0.854958, 0.490291, 0.756554, 0.594993],
		logistic_regression: [0.794568, 0.366412, 0.629213, 0.463129]
	};
	expect(modelIds).toEqual(Object.keys(expected));
	for (const id of modelIds) {
		const metric = modelMetrics[id];
		expect([metric.accuracy, metric.precision, metric.recall, metric.f1]).toEqual(expected[id]);
		expect(buildPredictionPayload(id, createDefaultInputs()).model_name).toBe(id);
	}
});
