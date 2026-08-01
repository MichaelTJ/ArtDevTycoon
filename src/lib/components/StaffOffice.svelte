<script lang="ts">
	import { canHireStaff, type StaffRole } from '$lib/data/staffRoles';

	interface Props {
		roles: StaffRole[];
		hiredIds: string[];
		cash: number;
		reputation: number;
		onhire: (id: string) => void;
		onclose: () => void;
		onopenteam?: () => void;
	}

	let { roles, hiredIds, cash, reputation, onhire, onclose, onopenteam }: Props = $props();

	function isHired(id: string): boolean {
		return hiredIds.includes(id);
	}

	function incomePerMinute(role: StaffRole): string {
		const perMin = role.incomePerSecond * 60;
		if (perMin === 0) return '';
		const rounded = Number.isInteger(perMin) ? String(perMin) : perMin.toFixed(1);
		return `$${rounded}/min`;
	}

	function hireDisabledReason(role: StaffRole): string | null {
		if (cash < role.hireCost) {
			return `Need $${role.hireCost - cash} more`;
		}
		if (reputation < role.requiredReputation) {
			return `Need ${role.requiredReputation - reputation} more reputation`;
		}
		return null;
	}
</script>

<div
	class="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-label="Staff Office"
>
	<div
		class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-5 shadow-sm"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold text-stone-800">Staff Office</h2>
				<p class="mt-1 text-sm text-stone-500">
					Hire once. Staff keep the studio earning and running while you are away. Named artists
					live in the
					{#if onopenteam}
						<button
							type="button"
							class="font-medium text-amber-700 underline hover:text-amber-800"
							onclick={onopenteam}
						>
							Artist team
						</button>
					{:else}
						Artist team
					{/if}
					panel.
				</p>
			</div>
			<button
				type="button"
				class="min-h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				aria-label="Close staff office"
				onclick={onclose}
			>
				Close
			</button>
		</div>

		<ul class="mt-4 space-y-3" aria-label="Staff roles">
			{#each roles as role (role.id)}
				{@const hired = isHired(role.id)}
				{@const disabledReason = hired ? null : hireDisabledReason(role)}
				{@const canHire = !hired && canHireStaff(role, { cash, reputation })}
				{@const perMin = incomePerMinute(role)}
				<li
					class="rounded-lg border p-3 {hired
						? 'border-amber-500 bg-amber-50'
						: 'border-stone-200 bg-white'}"
				>
					<div class="flex gap-3">
						<span class="text-2xl" aria-hidden="true">{role.icon}</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-medium text-stone-800">{role.name}</span>
								{#if hired}
									<span class="text-xs font-semibold tracking-wide text-amber-800 uppercase"
										>Hired</span
									>
								{/if}
							</div>
							<p class="mt-1 text-sm text-stone-500">{role.tagline}</p>
							<div class="mt-2 flex flex-wrap gap-2 text-xs font-medium text-stone-600">
								{#if perMin}
									<span class="rounded bg-stone-100 px-2 py-1">{perMin} passive</span>
								{/if}
								{#if role.autoInviteSpeedMultiplier > 1}
									<span class="rounded bg-stone-100 px-2 py-1">Auto-invites clients</span>
								{/if}
								{#if role.autoCurates}
									<span class="rounded bg-stone-100 px-2 py-1">Auto-curates gallery</span>
								{/if}
							</div>
							{#if !hired}
								<p class="mt-1 text-sm text-stone-600">
									Hire for ${role.hireCost} · {role.requiredReputation} reputation
								</p>
								<button
									type="button"
									class="mt-3 min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
									aria-label="Hire {role.name}"
									disabled={!canHire}
									aria-disabled={!canHire}
									title={disabledReason ?? undefined}
									onclick={() => {
										if (canHire) onhire(role.id);
									}}
								>
									{#if canHire}
										Hire
									{:else}
										{disabledReason}
									{/if}
								</button>
							{/if}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</div>
