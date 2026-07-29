<script lang="ts">
	interface Props {
		src: string;
		name: string;
		size?: 'sm' | 'md' | 'lg';
	}

	let { src, name, size = 'md' }: Props = $props();

	let imageFailed = $state(false);

	const sizeClasses: Record<NonNullable<Props['size']>, string> = {
		sm: 'h-8 w-8 text-xs',
		md: 'h-12 w-12 text-sm',
		lg: 'h-[72px] w-[72px] text-lg'
	};

	/** Up to two uppercase initials from the first two words of `name`. */
	function getInitials(value: string): string {
		const parts = value.trim().split(/\s+/).filter(Boolean);
		if (parts.length === 0) return '?';
		if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
		return (parts[0][0] + parts[1][0]).toUpperCase();
	}

	/** Warm palette colour derived deterministically from character codes. */
	function initialsBackground(value: string): string {
		let sum = 0;
		for (const ch of value) sum += ch.charCodeAt(0);
		const palette = ['#d97706', '#b45309', '#78716c', '#a8a29e', '#ca8a04', '#92400e'];
		return palette[sum % palette.length];
	}

	function handleError() {
		imageFailed = true;
	}
</script>

{#if imageFailed}
	<div
		class="flex shrink-0 items-center justify-center rounded-full font-semibold text-white {sizeClasses[
			size
		]}"
		style="background-color: {initialsBackground(name)}"
		role="img"
		aria-label={name}
	>
		{getInitials(name)}
	</div>
{:else}
	<img
		{src}
		alt={name}
		class="shrink-0 rounded-full object-cover {sizeClasses[size]}"
		onerror={handleError}
	/>
{/if}
