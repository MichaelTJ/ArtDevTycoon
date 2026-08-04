<script lang="ts">
	const textareaId = 'prompt-composer-textarea';

	interface Props {
		value?: string;
		disabled?: boolean;
		maxLength?: number;
		onsubmit?: (prompt: string) => void;
	}

	let { value = $bindable(''), disabled = false, maxLength = 500, onsubmit }: Props = $props();

	const trimmedLength = $derived(value.trim().length);
	const canSubmit = $derived(!disabled && trimmedLength > 0);
	const nearLimit = $derived(value.length > maxLength * 0.9);

	function submit() {
		if (!canSubmit || !onsubmit) return;
		onsubmit(value.trim());
	}

	function handleKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			submit();
		}
	}
</script>

<div class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm">
	<label for={textareaId} class="mb-2 block text-base font-medium text-stone-800"> My idea </label>
	<textarea
		id={textareaId}
		bind:value
		{disabled}
		maxlength={maxLength}
		rows={5}
		class="min-h-[120px] w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-base text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
		onkeydown={handleKeydown}></textarea>

	<div class="mt-2 flex flex-wrap items-center justify-between gap-3">
		<p class="text-sm {nearLimit ? 'text-red-700' : 'text-stone-500'}" aria-live="polite">
			{value.length} / {maxLength}
		</p>
		<p class="text-xs text-stone-500">Ctrl+Enter to submit</p>
	</div>

	<button
		type="button"
		class="mt-4 min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
		disabled={!canSubmit}
		onclick={submit}
	>
		Create Art
	</button>
</div>
