<script lang="ts">
	import { getClientTierInfo } from '$lib/data/clientTiers';
	import type { ClientTier } from '$lib/types/contracts';

	interface Props {
		tier: ClientTier;
	}

	let { tier }: Props = $props();

	const info = $derived(getClientTierInfo(tier));
</script>

<span
	class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium {info.badgeColor}"
	data-testid="client-tier-badge"
>
	<span aria-hidden="true">{info.icon}</span>
	{info.name}
</span>
