<script lang="ts">
	import BarkLiveRegion from '$lib/components/BarkLiveRegion.svelte';
	import type { BarkAnnounceHandler } from '$lib/studio/barkPresenter';
	import type { StudioBridge } from '$lib/studio/bridge';
	import { isDomEditableFocused, STUDIO_DOM_EDITABLE_FOCUSED_KEY } from '$lib/studio/domInputFocus';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		bridge: StudioBridge;
		/** Progressive gallery venue that selects the Phaser floor plan. */
		initialVenueId?: string;
		/** Extra classes for the game parent. */
		class?: string;
	}

	let { bridge, initialVenueId = 'fridge', class: className = '' }: Props = $props();

	let containerEl: HTMLDivElement | undefined = $state();
	let game: {
		destroy: (removeCanvas: boolean, noReturn?: boolean) => void;
		registry: { get: (key: string) => unknown; set: (key: string, value: unknown) => void };
	} | null = null;
	let bootState: 'loading' | 'ready' | 'error' = $state('loading');
	let bootError = $state('Studio failed to load.');

	let barkSpeakerLabel = $state<string | null>(null);
	let barkLine = $state<string | null>(null);

	const onBark: BarkAnnounceHandler = (payload) => {
		if (!payload) {
			barkSpeakerLabel = null;
			barkLine = null;
			return;
		}
		barkSpeakerLabel = payload.speakerLabel;
		barkLine = payload.text;
	};

	const BOOT_TIMEOUT_MS = 20_000;

	onMount(() => {
		let cancelled = false;
		let settled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		let pollId: ReturnType<typeof setInterval> | undefined;

		const syncDomEditableFocus = () => {
			queueMicrotask(() => {
				if (!game) return;
				game.registry.set(STUDIO_DOM_EDITABLE_FOCUSED_KEY, isDomEditableFocused());
			});
		};

		window.addEventListener('focusin', syncDomEditableFocus, true);
		window.addEventListener('focusout', syncDomEditableFocus, true);

		const clearTimers = () => {
			if (timeoutId !== undefined) clearTimeout(timeoutId);
			if (pollId !== undefined) clearInterval(pollId);
		};

		const markReady = () => {
			if (cancelled || settled) return;
			settled = true;
			bootState = 'ready';
			clearTimers();
		};

		const markError = (message: string) => {
			if (cancelled || settled) return;
			settled = true;
			bootState = 'error';
			bootError = message;
			clearTimers();
		};

		const unsub = bridge.subscribe((event) => {
			if (event.type === 'ready') markReady();
		});

		timeoutId = setTimeout(() => {
			markError(
				'Studio took too long to load. Refresh the page, or set STUDIO_FLOOR_ENABLED to false.'
			);
		}, BOOT_TIMEOUT_MS);

		void (async () => {
			if (!containerEl) return;
			try {
				const { createPhaserGame } = await import('$lib/studio/createGame');
				if (cancelled || !containerEl) return;
				const created = createPhaserGame(containerEl, bridge, { initialVenueId });
				if (cancelled) {
					created.destroy(true);
					return;
				}
				game = created;
				game.registry.set('onBark', onBark);
				syncDomEditableFocus();
				pollId = setInterval(() => {
					if (game?.registry.get('studioBootFailed') === true) {
						markError('Studio assets failed to load.');
					}
				}, 100);
			} catch {
				markError('Studio could not start in this browser.');
			}
		})();

		return () => {
			cancelled = true;
			clearTimers();
			unsub();
			window.removeEventListener('focusin', syncDomEditableFocus, true);
			window.removeEventListener('focusout', syncDomEditableFocus, true);
		};
	});

	onDestroy(() => {
		game?.registry.set('onBark', null);
		game?.destroy(true);
		game = null;
	});
</script>

<div class="studio-floor-wrap relative {className}">
	<div
		bind:this={containerEl}
		data-testid="studio-floor"
		class="studio-floor relative min-h-[420px] w-full overflow-hidden rounded-xl border border-stone-400 bg-stone-900"
		aria-label="Studio floor"
		aria-busy={bootState === 'loading'}
	>
		{#if bootState === 'loading'}
			<p
				class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-sm text-stone-200"
				role="status"
				data-testid="studio-floor-loading"
			>
				Loading studio…
			</p>
		{:else if bootState === 'error'}
			<p
				class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-amber-100"
				role="alert"
				data-testid="studio-floor-error"
			>
				{bootError}
			</p>
		{/if}
	</div>
	<BarkLiveRegion speakerLabel={barkSpeakerLabel} line={barkLine} />
</div>
