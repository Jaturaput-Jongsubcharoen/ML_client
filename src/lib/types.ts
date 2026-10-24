export type ModelId =
	| 'random_forest'
	| 'knn'
	| 'svm'
	| 'neural_network'
	| 'logistic_regression';

export type Theme = 'dark' | 'light';

export interface ModelMetrics {
	accuracy: number;
	precision: number;
	recall: number;
	f1: number;
	description: string;
}

export interface PredictionInput {
	categorical: Record<string, string>;
	latitude: string;
	longitude: string;
}

export interface PredictionPayload {
	model_name: ModelId;
	input: Record<string, number>;
}

export interface PredictionResponse {
	model: ModelId;
	prediction: 0 | 1;
}

export type InputErrors = Record<string, string>;
