<script lang="ts">
	interface Props {
		onopen: () => void;
	}

	let { onopen }: Props = $props();
</script>

<div class="generation-ready-toast fixed top-20 right-4 z-50">
	<div role="status" aria-live="polite">
		<button
			type="button"
			class="min-h-11 max-w-xs rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-left shadow-lg hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
			aria-label="Your painting is ready"
			onclick={onopen}
		>
			<span class="block font-semibold text-stone-800">Your painting is ready</span>
			<span class="mt-1 block text-sm font-normal text-stone-600" aria-hidden="true">
				Compare your drawing and the AI image
			</span>
		</button>
	</div>
</div>

<style>
	.generation-ready-toast {
		animation: toast-in 200ms ease-out;
	}

	@media (prefers-reduced-motion: reduce) {
		.generation-ready-toast {
			animation: none;
		}
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
