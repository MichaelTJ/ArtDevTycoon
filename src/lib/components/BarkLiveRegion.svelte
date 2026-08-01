<script lang="ts">
	interface Props {
		/** Human speaker label, e.g. "Mum". */
		speakerLabel?: string | null;
		/** Bark line text; null/empty clears the live region. */
		line?: string | null;
	}

	let { speakerLabel = null, line = null }: Props = $props();

	const announce = $derived(line && speakerLabel ? `${speakerLabel}: ${line}` : line ? line : '');
</script>

<div class="bark-live sr-only" aria-live="polite" aria-atomic="true" data-testid="bark-live">
	{announce}
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>
