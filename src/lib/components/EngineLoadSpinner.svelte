<script lang="ts">
	interface Props {
		visible: boolean;
		/** e.g. 'Loading Janus Pro…' */
		label: string;
		reducedMotion?: boolean;
	}

	let { visible, label, reducedMotion = false }: Props = $props();
</script>

{#if visible}
	<div
		class={['engine-load-spinner', reducedMotion && 'engine-load-spinner--static']}
		role="status"
		aria-live="polite"
		aria-label={label}
	>
		<span class="engine-load-spinner__disc" aria-hidden="true"></span>
		<span class="engine-load-spinner__label">{label}</span>
	</div>
{/if}

<style>
	.engine-load-spinner {
		position: fixed;
		right: 1.25rem;
		bottom: 5.5rem;
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.35rem;
		pointer-events: none;
	}

	.engine-load-spinner__disc {
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid #d6d3d1;
		border-top-color: #d97706;
		border-radius: 9999px;
		animation: engine-spin 0.8s linear infinite;
	}

	.engine-load-spinner__label {
		max-width: 12rem;
		font-size: 0.75rem;
		line-height: 1.2;
		color: #57534e;
		text-align: right;
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
