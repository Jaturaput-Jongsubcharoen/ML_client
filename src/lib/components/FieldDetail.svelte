<script lang="ts">
	import type { DetailField } from '../data/fieldDetails';
	import { getFieldDetail } from '../data/fieldDetails';

let {
	field,
	label,
	value
}: {
	field: DetailField;
	label: string;
	value: string;
} = $props();

let trigger: HTMLButtonElement;
let dialog: HTMLDialogElement;

const detail = $derived(getFieldDetail(field, value));

function openDialog() {
	dialog.showModal();
}

function closeDialog() {
	dialog.close();
}

function restoreFocus() {
	trigger.focus();
}
</script>

<button
	bind:this={trigger}
	class="detail-button"
	type="button"
	aria-haspopup="dialog"
	aria-label={`Detail for ${label}`}
	onclick={openDialog}
>
	<span aria-hidden="true">ⓘ</span> Detail
</button>

<dialog
	bind:this={dialog}
	class="field-dialog"
	aria-labelledby={`${field}-detail-title`}
	aria-describedby={`${field}-detail-description ${field}-detail-meaning`}
	onclose={restoreFocus}
>
	<div class="dialog-heading">
		<h2 id={`${field}-detail-title`}>{label} details</h2>
		<button class="dialog-close" type="button" aria-label={`Close ${label} details`} onclick={closeDialog}>
			<span aria-hidden="true">×</span>
		</button>
	</div>
	<p id={`${field}-detail-description`}><strong>Field:</strong> {detail.description}</p>
	<p class="selected-value"><strong>Selected:</strong> {value}</p>
	<p id={`${field}-detail-meaning`}><strong>Meaning:</strong> {detail.meaning}</p>
</dialog>

<style>
	.detail-button {
		display: inline-flex;
		min-height: 2.75rem;
		align-items: center;
		gap: 0.3rem;
		padding: 0.25rem 0.45rem;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: var(--color-surface);
		color: var(--color-accent);
		cursor: pointer;
		font-size: 0.7rem;
		font-weight: 650;
	}

	.detail-button:hover {
		border-color: var(--color-accent);
	}

	.field-dialog {
		width: min(34rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 2rem);
		margin: auto;
		padding: clamp(1.25rem, 4vw, 2rem);
		border: 1px solid var(--color-border);
		border-radius: 0.55rem;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-card);
	}

	.field-dialog::backdrop {
		background: rgb(10 12 14 / 64%);
		backdrop-filter: blur(3px);
	}

	.dialog-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		margin: 0;
		font-size: clamp(1.15rem, 4vw, 1.55rem);
		font-weight: 600;
	}

	p {
		margin: 1rem 0 0;
		color: var(--color-muted);
		font-size: 0.85rem;
	}

	.selected-value {
		overflow-wrap: anywhere;
		color: var(--color-text);
	}

	.dialog-close {
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		flex: 0 0 auto;
		place-items: center;
		border: 1px solid var(--color-border);
		border-radius: 0.25rem;
		background: transparent;
		color: var(--color-text);
		cursor: pointer;
		font-size: 1.4rem;
		line-height: 1;
	}

	@media (max-width: 390px) {
		.detail-button {
			padding-inline: 0.35rem;
			font-size: 0.66rem;
		}
	}
</style>
