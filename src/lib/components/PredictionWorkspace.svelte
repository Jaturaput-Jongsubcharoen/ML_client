<script lang="ts">
	import {
		buildPredictionPayload,
		featureGroups,
		featureLabels,
		featureOptions,
		formatFeatureOption,
		createDefaultInputs,
		validatePredictionInput
	} from '../data/features';
	import { modelNames } from '../data/models';
	import { requestPrediction } from '../services/predictionApi';
	import FieldDetail from './FieldDetail.svelte';
	import type { ModelId, PredictionResponse } from '../types';
	import PredictionResult from './PredictionResult.svelte';

	let { selectedModel, isLoading = $bindable(false), onResult }: {
		selectedModel: ModelId;
		isLoading?: boolean;
		onResult: (result: PredictionResponse | null) => void;
	} = $props();
	let input = $state(createDefaultInputs());
	let result = $state<PredictionResponse | null>(null);
	let resultSequence = $state(0);
	let errorMessage = $state('');
	let errors = $state<Record<string, string>>({});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (isLoading) return;
		const validationErrors = validatePredictionInput(input);
		errors = validationErrors;

		if (Object.keys(validationErrors).length > 0) {
			result = null;
			onResult(null);
			errorMessage = 'Review the highlighted fields before requesting a prediction.';
			document.getElementById(Object.keys(validationErrors)[0])?.focus();
			return;
		}

		if (event.submitter?.id === 'predict-customized') {
			document.getElementById('prediction-heading')?.focus({ preventScroll: true });
			document.getElementById('prediction')?.scrollIntoView({ block: 'start' });
		}

		isLoading = true;
		errorMessage = '';
		result = null;
		onResult(null);

		try {
			const response = await requestPrediction(buildPredictionPayload(selectedModel, input));
			result = response;
			resultSequence += 1;
			onResult(response);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'An unexpected error prevented the prediction.';
			console.error('Prediction request failed.', error);
		} finally {
			isLoading = false;
		}
	}

	function dismiss() {
		result = null;
		onResult(null);
		document.getElementById('request-prediction')?.focus();
	}
	function another() {
		dismiss();
		document.getElementById('ROAD_CLASS')?.focus();
	}
</script>

<form class="prediction-form" onsubmit={handleSubmit} novalidate aria-label="Collision classification">
<section class="prediction-action" id="prediction" aria-labelledby="prediction-heading" aria-busy={isLoading}>
	<div class="section-heading">
		<span class="eyebrow">03 / Predict &amp; view result</span>
		<h2 id="prediction-heading" tabindex="-1">Read the classification.</h2>
		<p>Use the selected model to classify a sample Toronto collision record instantly, or customize the conditions below before predicting.</p>
		<p class="prediction-caveat">The result is a binary classification based on historical collision data, not a probability or future safety forecast.</p>
	</div>
	<div class="submit-row">
		<button id="request-prediction" class="button button-primary" type="submit" disabled={isLoading}>
			{#if isLoading}
				<span class="spinner" aria-hidden="true"></span>
				Waiting for model…
			{:else}
				Request Prediction <span aria-hidden="true">↗</span>
			{/if}
		</button>
		<a href="#customize" class="button button-customize">Customize Conditions <span aria-hidden="true">↓</span></a>
	</div>
	<p class="submit-note">Selected classifier / {modelNames[selectedModel]}. Prediction is served by the existing Flask API.</p>

	{#if isLoading}
		<p class="status loading" role="status" aria-live="polite">
			Connecting to the model service. Its first response may take longer while it starts.
		</p>
	{/if}

	{#if errorMessage}
		<div class="status error" role="alert">
			<div>
				<strong>Prediction unavailable</strong>
				<p>{errorMessage}</p>
			</div>
			{#if !isLoading}
				<button class="button retry" type="submit">Retry</button>
			{/if}
		</div>
	{/if}

	{#if result}
		{#key resultSequence}
			<PredictionResult {result} onDismiss={dismiss} onAnother={another} />
		{/key}
	{/if}
</section>
<section class="prediction-section" id="customize" aria-labelledby="customize-heading">
	<div class="section-heading">
		<span class="eyebrow">04 / Customize collision conditions</span>
		<h2 id="customize-heading">Define the record.</h2>
		<p>
			Enter supported categories from the Toronto collision dataset.
			The response is the model’s binary class only; it is not a probability or a forecast.
		</p>
	</div>

	<div class="prediction-card card">
		<div class="form-topline">
			<div>
				<strong>Selected classifier / {modelNames[selectedModel]}</strong>
				<p>Your model choice carries through from the cockpit above.</p>
			</div>
			<a href="#models" class="model-index">Change model ↑</a>
		</div>

		{#each featureGroups as group, groupIndex (group.label)}
			<fieldset>
				<legend>
					<span class="group-number">{String(groupIndex + 1).padStart(2, '0')}</span>
					<span>{group.label}</span>
				</legend>
				<p class="group-description">{group.description}</p>
				<div class="field-grid">
					{#each group.fields as field (field)}
						<div class="field">
							<div class="field-heading">
								<label for={field}>{featureLabels[field]}</label>
								<FieldDetail field={field} label={featureLabels[field]} value={input.categorical[field]} />
							</div>
							<select
								id={field}
								bind:value={input.categorical[field]}
								aria-invalid={Boolean(errors[field])}
								aria-describedby={errors[field] ? `${field}-error` : `${field}-hint`}
								disabled={isLoading}
							>
								{#each featureOptions[field] as option (option)}
									<option value={option}>{formatFeatureOption(field, option)}</option>
								{/each}
							</select>
							{#if errors[field]}
								<p class="field-error" id={`${field}-error`}>{errors[field]}</p>
							{:else}
								<p class="field-hint" id={`${field}-hint`}>{field}</p>
							{/if}
						</div>
					{/each}
				</div>
			</fieldset>
		{/each}

		<fieldset>
			<legend>
				<span class="group-number">05</span>
				<span>Geographic coordinates</span>
			</legend>
			<p class="group-description">
				Use coordinates for a historical Toronto location. They are model inputs, not an output location.
			</p>
			<div class="field-grid coordinates">
				<div class="field">
					<div class="field-heading">
						<label for="latitude">Latitude</label>
						<FieldDetail field="latitude" label="Latitude" value={input.latitude} />
					</div>
					<input
						id="latitude"
						bind:value={input.latitude}
						type="text"
						inputmode="decimal"
						autocomplete="off"
						aria-invalid={Boolean(errors.latitude)}
						aria-describedby={errors.latitude ? 'latitude-error' : 'latitude-hint'}
						disabled={isLoading}
					/>
					{#if errors.latitude}
						<p class="field-error" id="latitude-error">{errors.latitude}</p>
					{:else}
						<p class="field-hint" id="latitude-hint">Decimal degrees · −90 to 90</p>
					{/if}
				</div>
				<div class="field">
					<div class="field-heading">
						<label for="longitude">Longitude</label>
						<FieldDetail field="longitude" label="Longitude" value={input.longitude} />
					</div>
					<input
						id="longitude"
						bind:value={input.longitude}
						type="text"
						inputmode="decimal"
						autocomplete="off"
						aria-invalid={Boolean(errors.longitude)}
						aria-describedby={errors.longitude ? 'longitude-error' : 'longitude-hint'}
						disabled={isLoading}
					/>
					{#if errors.longitude}
						<p class="field-error" id="longitude-error">{errors.longitude}</p>
					{:else}
						<p class="field-hint" id="longitude-hint">Decimal degrees · −180 to 180</p>
					{/if}
				</div>
			</div>
		</fieldset>

		<aside class="model-caution">
			<strong>Interpret with care</strong>
			<p>
				The source feature list includes recorded injury severity, which is related to the target label.
				This retrospective model may therefore contain outcome leakage and must not be used for safety
				decisions.
			</p>
		</aside>
		<div class="submit-row">
			<button id="predict-customized" class="button button-primary" type="submit" disabled={isLoading}>
				Predict With These Conditions <span aria-hidden="true">↑</span>
			</button>
		</div>
	</div>
</section>
</form>

<style>
	.prediction-section {
		padding-block: 3rem;
	}

	.prediction-card {
		padding: clamp(1.1rem, 4vw, 2.5rem);
	}

	.prediction-action { padding: 2rem 0 4rem; border-bottom: 1px solid var(--color-border); }
	.form-topline {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.form-topline strong,
	.field label {
		display: block;
		margin-bottom: 0.45rem;
		font-size: 0.86rem;
		font-weight: 650;
	}

	.field-heading {
		display: flex;
		min-height: 2.25rem;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.field-heading label {
		padding-top: 0.35rem;
	}

	.form-topline p,
	.group-description {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.77rem;
	}

	.model-index,
	.group-number {
		color: var(--color-accent);
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.12em;
	}

	.prediction-card select,
	.prediction-card input {
		width: 100%;
		min-height: 2.85rem;
		padding: 0.65rem 0.8rem;
		border: 1px solid var(--color-border);
		border-radius: 0.3rem;
		background: var(--color-bg);
		color: var(--color-text);
	}

	.prediction-card select:disabled,
	.prediction-card input:disabled {
		opacity: 0.75;
	}

	fieldset {
		min-width: 0;
		margin: 2rem 0 0;
		padding: 1.4rem 0 0;
		border: 0;
		border-top: 1px solid var(--color-border);
	}

	legend {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0 0.6rem 0 0;
		font-size: 1rem;
		font-weight: 650;
	}

	.group-description {
		margin: 0 0 1.1rem 2.1rem;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.field {
		min-width: 0;
	}

	.field-hint,
	.field-error {
		margin: 0.35rem 0 0;
		font-size: 0.69rem;
	}

	.field-hint {
		color: var(--color-muted);
	}

	.field-error {
		color: var(--color-danger);
	}

	.model-caution {
		margin-top: 2rem;
		padding: 1rem 1.1rem;
		border-left: 2px solid var(--color-accent);
		background: var(--color-accent-soft);
	}

	.model-caution strong {
		font-size: 0.78rem;
	}

	.model-caution p {
		margin: 0.3rem 0 0;
		color: var(--color-muted);
		font-size: 0.75rem;
	}

	.submit-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.submit-note {
		color: var(--color-muted);
		font-size: 0.72rem;
	}

	.section-heading .prediction-caveat {
		margin-top: 0.8rem;
		font-size: 0.75rem;
	}

	.button-customize {
		border-color: var(--color-text);
		background: var(--color-text);
		color: var(--color-bg);
	}

	.button-customize:hover {
		border-color: var(--color-muted);
		background: var(--color-muted);
	}

	.spinner {
		width: 0.9rem;
		height: 0.9rem;
		border: 2px solid rgb(255 255 255 / 45%);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	.status {
		margin: 1rem 0 0;
		padding: 0.9rem 1rem;
		border-radius: 0.35rem;
		font-size: 0.8rem;
	}

	.loading {
		border: 1px solid var(--color-border);
		color: var(--color-muted);
	}

	.error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border: 1px solid color-mix(in srgb, var(--color-danger), transparent 45%);
		background: color-mix(in srgb, var(--color-danger), transparent 93%);
	}

	.error strong,
	.error p {
		margin: 0;
	}

	.error p {
		margin-top: 0.2rem;
	}

	.retry {
		min-height: 2.35rem;
		flex: 0 0 auto;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 620px) {
		.field-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.submit-row,
		.error {
			align-items: stretch;
			flex-direction: column;
		}

		.submit-row .button {
			width: 100%;
		}

	}
</style>
