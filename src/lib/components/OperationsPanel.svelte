<script lang="ts">
	import type {
		GalleryFilter,
		OperationalNeed,
		OperationsQuery,
		OperationsSummary
	} from '$lib/game/operations';
	import type { GalleryEntry } from '$lib/types/contracts';

	interface Props {
		summary: OperationsSummary;
		needs: OperationalNeed[];
		entries: GalleryEntry[];
		totalMatching: number;
		query?: OperationsQuery;
		onquerychange?: (query: OperationsQuery) => void;
	}

	let {
		summary,
		needs,
		entries,
		totalMatching,
		query = $bindable({ search: '', filter: 'all' }),
		onquerychange
	}: Props = $props();

	const filterOptions: { value: GalleryFilter; label: string }[] = [
		{ value: 'all', label: 'All commissions' },
		{ value: 'recent', label: 'Recent (3)' },
		{ value: 'low-score', label: 'Low score (<5)' },
		{ value: 'high-payout', label: 'High payout ($100+)' }
	];

	const urgentNeeds = $derived(needs.filter((need) => need.urgency !== 'info'));
	const infoNeeds = $derived(needs.filter((need) => need.urgency === 'info'));

	function urgencyLabel(urgency: OperationalNeed['urgency']): string {
		switch (urgency) {
			case 'critical':
				return 'Urgent';
			case 'attention':
				return 'Needs attention';
			case 'info':
				return 'Update';
		}
	}

	function urgencyClasses(urgency: OperationalNeed['urgency']): string {
		switch (urgency) {
			case 'critical':
				return 'border-red-300 bg-red-50 text-red-900';
			case 'attention':
				return 'border-amber-300 bg-amber-50 text-amber-900';
			case 'info':
				return 'border-stone-300 bg-stone-50 text-stone-800';
		}
	}

	function scoreClasses(score: number): string {
		if (score < 4) return 'bg-red-100 text-red-800';
		if (score < 7) return 'bg-amber-100 text-amber-800';
		if (score < 9) return 'bg-lime-100 text-lime-800';
		return 'bg-emerald-100 text-emerald-800';
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	function updateSearch(value: string) {
		query = { ...query, search: value };
		onquerychange?.(query);
	}

	function updateFilter(value: GalleryFilter) {
		query = { ...query, filter: value };
		onquerychange?.(query);
	}

	function progressPercent(value: number): number {
		return Math.round(value * 100);
	}
</script>

<section
	class="rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	aria-labelledby="operations-heading"
>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h2 id="operations-heading" class="text-lg font-semibold text-stone-800">
				Studio Operations
			</h2>
			<p class="text-sm text-stone-500">{summary.headline}</p>
		</div>
		<p class="text-sm font-medium text-stone-600" aria-live="polite">
			{totalMatching} matching record{totalMatching === 1 ? '' : 's'}
		</p>
	</div>

	<div class="mb-5 grid gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm text-stone-700">
			<span>Search commissions</span>
			<input
				type="search"
				class="min-h-11 rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				value={query.search}
				placeholder="Title or client name"
				oninput={(event) => updateSearch(event.currentTarget.value)}
			/>
		</label>

		<label class="flex flex-col gap-1 text-sm text-stone-700">
			<span>Filter</span>
			<select
				class="min-h-11 rounded-lg border border-stone-300 px-3 py-2 text-base text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				value={query.filter}
				onchange={(event) => updateFilter(event.currentTarget.value as GalleryFilter)}
			>
				{#each filterOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if urgentNeeds.length > 0}
		<div class="mb-5" role="alert" aria-label="Urgent studio needs">
			<h3 class="mb-2 text-sm font-semibold tracking-wide text-red-800 uppercase">
				Urgent &amp; unresolved
			</h3>
			<ul class="grid gap-2">
				{#each urgentNeeds as need (need.id)}
					<li class={`rounded-lg border p-3 ${urgencyClasses(need.urgency)}`}>
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold">{need.title}</p>
								<p class="mt-1 text-sm">{need.detail}</p>
							</div>
							<span
								class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold uppercase"
								aria-label={urgencyLabel(need.urgency)}
							>
								{urgencyLabel(need.urgency)}
							</span>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<article class="rounded-lg border border-stone-200 bg-stone-50 p-3">
			<p class="text-xs tracking-wide text-stone-500 uppercase">Cash on hand</p>
			<p class="text-2xl font-semibold text-emerald-700">${summary.cash}</p>
			<p class="text-sm text-stone-600">${summary.cashRemaining} to target</p>
		</article>
		<article class="rounded-lg border border-stone-200 bg-stone-50 p-3">
			<p class="text-xs tracking-wide text-stone-500 uppercase">Commissions</p>
			<p class="text-2xl font-semibold text-stone-800">
				{summary.commissionsCompleted} / {summary.commissionsTarget}
			</p>
			<p class="text-sm text-stone-600">{summary.commissionsRemaining} remaining</p>
		</article>
		<article class="rounded-lg border border-stone-200 bg-stone-50 p-3">
			<p class="text-xs tracking-wide text-stone-500 uppercase">Portfolio earnings</p>
			<p class="text-2xl font-semibold text-stone-800">${summary.totalEarnings}</p>
			<p class="text-sm text-stone-600">
				{summary.completedCount} finished piece{summary.completedCount === 1 ? '' : 's'}
			</p>
		</article>
		<article class="rounded-lg border border-stone-200 bg-stone-50 p-3">
			<p class="text-xs tracking-wide text-stone-500 uppercase">Average score</p>
			<p class="text-2xl font-semibold text-stone-800">
				{summary.averageScore ?? '—'}
			</p>
			<p class="text-sm text-stone-600">Across completed work</p>
		</article>
	</div>

	<div class="mb-5 grid gap-4 lg:grid-cols-2">
		<div>
			<div class="mb-1 flex items-center justify-between text-sm text-stone-700">
				<span>Cash progress</span>
				<span>{progressPercent(summary.cash / summary.cashTarget)}%</span>
			</div>
			<progress
				class="h-3 w-full accent-amber-600"
				value={summary.cash}
				max={summary.cashTarget}
				aria-label="Cash progress toward Level 1 target"
			></progress>
		</div>
		<div>
			<div class="mb-1 flex items-center justify-between text-sm text-stone-700">
				<span>Commission progress</span>
				<span>{progressPercent(summary.commissionsCompleted / summary.commissionsTarget)}%</span>
			</div>
			<progress
				class="h-3 w-full accent-amber-600"
				value={summary.commissionsCompleted}
				max={summary.commissionsTarget}
				aria-label="Commission progress toward Level 1 target"
			></progress>
		</div>
	</div>

	{#if infoNeeds.length > 0}
		<div class="mb-5">
			<h3 class="mb-2 text-sm font-semibold text-stone-700">Status updates</h3>
			<ul class="grid gap-2">
				{#each infoNeeds as need (need.id)}
					<li class={`rounded-lg border p-3 ${urgencyClasses(need.urgency)}`}>
						<p class="font-medium">{need.title}</p>
						<p class="mt-1 text-sm">{need.detail}</p>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<div class="overflow-x-auto">
		<h3 class="mb-2 text-sm font-semibold text-stone-700">Commission records</h3>
		{#if entries.length === 0}
			<p class="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500">
				No commissions match your search and filter.
			</p>
		{:else}
			<table class="min-w-full border-collapse text-left text-sm">
				<caption class="sr-only">
					Filtered commission history showing title, client, score, payout, and completion date
				</caption>
				<thead class="border-b border-stone-200 text-stone-600">
					<tr>
						<th scope="col" class="px-3 py-2 font-semibold">Title</th>
						<th scope="col" class="px-3 py-2 font-semibold">Client</th>
						<th scope="col" class="px-3 py-2 font-semibold">Score</th>
						<th scope="col" class="px-3 py-2 font-semibold">Payout</th>
						<th scope="col" class="px-3 py-2 font-semibold">Completed</th>
					</tr>
				</thead>
				<tbody>
					{#each entries as entry (entry.id)}
						<tr class="border-b border-stone-100">
							<td class="px-3 py-2 font-medium text-stone-800">{entry.title}</td>
							<td class="px-3 py-2 text-stone-700">{entry.clientName}</td>
							<td class="px-3 py-2">
								<span
									class={`inline-flex min-w-12 justify-center rounded-full px-2 py-1 text-xs font-semibold ${scoreClasses(entry.score)}`}
								>
									{entry.score}
								</span>
							</td>
							<td class="px-3 py-2 text-emerald-700">${entry.payout}</td>
							<td class="px-3 py-2 text-stone-600">{formatDate(entry.completedAt)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</section>

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
		border: 0;
	}
</style>
