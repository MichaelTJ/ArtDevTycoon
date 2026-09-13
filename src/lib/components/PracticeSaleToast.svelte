<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';

	interface Props {
		sale: { title: string; price: number; buyerLabel: string } | null;
	}

	let { sale }: Props = $props();
</script>

{#if sale}
	<div
		class={['toast', prefersReducedMotion.current && 'toast-static']}
		role="status"
		aria-live="polite"
	>
		{sale.buyerLabel} bought {sale.title} for ${sale.price}.
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		top: 5rem;
		left: 50%;
		z-index: 45;
		box-sizing: border-box;
		width: min(22rem, calc(100vw - 2rem));
		padding: 0.75rem 1rem;
		border: 1px solid #fcd34d;
		border-radius: 0.75rem;
		background: #fffbeb;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.12);
		transform: translateX(-50%);
		pointer-events: none;
		animation: toast-in 180ms ease-out;
	}

	.toast-static {
		animation: none;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(-0.35rem);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
