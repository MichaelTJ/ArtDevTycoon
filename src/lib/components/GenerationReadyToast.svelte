<script lang="ts">
	interface Props {
		onopen: () => void;
	}

	let { onopen }: Props = $props();
</script>

<div class="ready" role="status" aria-live="polite">
	<button type="button" class="ready-btn" onclick={onopen}>
		<span class="title">Finished!</span>
		<span class="hint">Click here to compare drawings.</span>
	</button>
</div>

<style>
	.ready {
		box-sizing: border-box;
		width: 12.5rem;
	}

	.ready-btn {
		box-sizing: border-box;
		display: block;
		width: 100%;
		min-height: 2.75rem;
		padding: 0.75rem;
		border: 1px solid #fcd34d;
		border-radius: 0.75rem;
		background: #fffbeb;
		text-align: left;
		cursor: pointer;
	}

	.ready-btn:hover {
		background: #fef3c7;
	}

	.ready-btn:focus-visible {
		outline: 2px solid #d97706;
		outline-offset: 2px;
	}

	.title {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #292524;
	}

	.hint {
		display: block;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.35;
		color: #b45309;
		text-decoration: underline;
	}
</style>
