<script lang="ts">
	interface Props {
		visible: boolean;
		/** e.g. 'Loading Janus Pro…' */
		label: string;
		reducedMotion?: boolean;
		/** 0–100 integer; omit/null hides the number. */
		percent?: number | null;
	}

	let { visible, label, reducedMotion = false, percent = null }: Props = $props();

	const statusName = $derived(percent != null ? `${label} ${percent}%` : label);
</script>

{#if visible}
	<div
		class={[
			'engine-load-spinner rounded-xl border border-stone-300 bg-white p-3 shadow-lg',
			reducedMotion && 'engine-load-spinner--static'
		]}
		role="status"
		aria-live="polite"
		aria-label={statusName}
	>
		<span class="engine-load-spinner__disc" aria-hidden="true"></span>
		<span class="engine-load-spinner__copy">
			<span class="engine-load-spinner__label">{label}</span>
			{#if percent != null}
				<span class="engine-load-spinner__percent">{percent}%</span>
			{/if}
		</span>
	</div>
{/if}

<style>
	.engine-load-spinner {
		position: fixed;
		right: 1.25rem;
		bottom: 5.5rem;
		z-index: 30;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.75rem;
		pointer-events: none;
	}

	.engine-load-spinner__disc {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		border: 2px solid #d6d3d1;
		border-top-color: #d97706;
		border-radius: 9999px;
		animation: engine-spin 0.8s linear infinite;
	}

	.engine-load-spinner__copy {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 0.15rem;
	}

	.engine-load-spinner__label {
		max-width: 12rem;
		font-size: 0.75rem;
		line-height: 1.2;
		color: #57534e;
	}

	.engine-load-spinner__percent {
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.2;
		color: #1c1917;
	}

	.engine-load-spinner--static .engine-load-spinner__disc {
		animation: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.engine-load-spinner__disc {
			animation: none;
		}
	}

	@keyframes engine-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
