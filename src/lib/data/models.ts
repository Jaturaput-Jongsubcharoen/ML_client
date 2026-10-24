import type { ModelId, ModelMetrics } from '../types';

export const modelIds: ModelId[] = [
	'random_forest',
	'knn',
	'svm',
	'neural_network',
	'logistic_regression'
];

export const modelNames: Record<ModelId, string> = {
	random_forest: 'Random Forest',
	knn: 'K-Nearest Neighbors',
	svm: 'Support Vector Machine',
	neural_network: 'Neural Network',
	logistic_regression: 'Logistic Regression'
};

export const modelMetrics: Record<ModelId, ModelMetrics> = {
	random_forest: {
		accuracy: 0.953586,
		precision: 0.896018,
		recall: 0.758427,
		f1: 0.821501,
		description:
			'An ensemble of decision trees combines multiple learned rules to classify a collision outcome.'
	},
	knn: {
		accuracy: 0.921414,
		precision: 0.689103,
		recall: 0.805243,
		f1: 0.74266,
		description:
			'Classifies an example by comparing it with nearby examples in the encoded feature space.'
	},
	neural_network: {
		accuracy: 0.854958,
		precision: 0.490291,
		recall: 0.756554,
		f1: 0.594993,
		description:
			'Learns patterns through layers of connected units and produces a binary classification.'
	},
	svm: {
		accuracy: 0.837289,
		precision: 0.442759,
		recall: 0.601124,
		f1: 0.509929,
		description:
			'Finds a decision boundary that separates the two classes in the feature space.'
	},
	logistic_regression: {
		accuracy: 0.794568,
		precision: 0.366412,
		recall: 0.629213,
		f1: 0.463129,
		description:
			'A linear classifier estimates class membership from a weighted combination of input features.'
	}
};

export const metricLabels = {
	accuracy: 'Accuracy',
	precision: 'Precision',
	recall: 'Recall',
	f1: 'F1 score'
} as const;
