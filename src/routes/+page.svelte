<script lang="ts">
	import { OperationsPanel } from '$lib/components';
	import { buildOperationalSnapshot, type OperationsQuery } from '$lib/game';
	import type { GalleryEntry } from '$lib/types/contracts';

	const demoHistory: GalleryEntry[] = [
		{
			id: 'g3',
			imageUrl:
				'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23d6d3d1" width="96" height="96"/%3E%3C/svg%3E',
			title: 'Regal Cat',
			payout: 95,
			score: 8.5,
			clientName: 'Cat Enthusiast',
			briefId: 'c3',
			completedAt: Date.now() - 86_400_000
		},
		{
			id: 'g2',
			imageUrl:
				'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23fcd34d" width="96" height="96"/%3E%3C/svg%3E',
			title: 'Magic Sword',
			payout: 42,
			score: 4.2,
			clientName: 'Fantasy Novelist',
			briefId: 'c2',
			completedAt: Date.now() - 172_800_000
		},
		{
			id: 'g1',
			imageUrl:
				'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96"%3E%3Crect fill="%23fdba74" width="96" height="96"/%3E%3C/svg%3E',
			title: 'Morning Coffee',
			payout: 88,
			score: 6.5,
			clientName: 'Local Cafe Owner',
			briefId: 'c1',
			completedAt: Date.now() - 259_200_000
		}
	];

	let operationsQuery = $state<OperationsQuery>({ search: '', filter: 'all' });

	const operations = $derived(
		buildOperationalSnapshot({
			phase: 'results',
			cash: 225,
			commissionsCompleted: 3,
			galleryHistory: demoHistory,
			errorMessage: null,
			currentClient: null,
			query: operationsQuery
		})
	);
</script>

<svelte:head>
	<title>Art Gallery Tycoon — Garage Studio</title>
</svelte:head>

<main class="min-h-screen bg-stone-100 px-4 py-6 text-stone-800">
	<div class="mx-auto flex max-w-5xl flex-col gap-6">
		<header>
			<h1 class="text-2xl font-bold">Art Gallery Tycoon</h1>
			<p class="text-sm text-stone-500">
				Garage Studio preview — full game loop arrives with spec 04 integration.
			</p>
		</header>

		<OperationsPanel
			summary={operations.summary}
			needs={operations.needs}
			entries={operations.filteredEntries}
			totalMatching={operations.totalMatching}
			bind:query={operationsQuery}
		/>
	</div>
</main>
