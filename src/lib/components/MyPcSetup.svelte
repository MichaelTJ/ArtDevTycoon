<script lang="ts">
	interface Props {
		baseUrl?: string;
		apiKey?: string;
		testState?: 'idle' | 'testing' | 'success' | 'error';
		testError?: string | null;
		ontest: () => void;
		onconnect: () => void;
		oncancel: () => void;
	}

	let {
		baseUrl = $bindable(''),
		apiKey = $bindable(''),
		testState = 'idle',
		testError = null,
		ontest,
		onconnect,
		oncancel
	}: Props = $props();

	let helpOpen = $state(false);

	const connectDisabled = $derived(testState !== 'success');
	const inputsDisabled = $derived(testState === 'testing');
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="my-pc-setup-title"
>
	<div class="w-full max-w-md space-y-4 rounded-xl border border-stone-300 bg-white p-6 shadow-lg">
		<h2 id="my-pc-setup-title" class="text-xl font-bold text-stone-800">Connect My PC</h2>
		<p class="text-sm text-stone-600">
			Run JanusLink on your GPU PC, join Tailscale, then paste the Tailscale HTTPS URL and API key
			from the installer.
		</p>

		<label class="block text-sm font-medium text-stone-800">
			PC Tailscale URL
			<input
				type="url"
				class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				placeholder="https://your-pc.tailnet-xxxx.ts.net"
				autocomplete="off"
				disabled={inputsDisabled}
				bind:value={baseUrl}
			/>
		</label>

		<label class="block text-sm font-medium text-stone-800">
			API key
			<input
				type="password"
				class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				placeholder="JANUS_API_KEY from the installer"
				autocomplete="off"
				disabled={inputsDisabled}
				bind:value={apiKey}
			/>
		</label>

		<button
			type="button"
			class="text-left text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
			aria-expanded={helpOpen}
			onclick={() => {
				helpOpen = !helpOpen;
			}}
		>
			{helpOpen ? 'Hide setup help' : 'Setup help'}
		</button>

		{#if helpOpen}
			<div class="rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
				<p>
					Install from
					<a
						class="font-medium text-amber-800 underline"
						href="https://github.com/MichaelTJ/ADTLocalServe"
						target="_blank"
						rel="noopener noreferrer">ADTLocalServe / JanusLink</a
					>. On the PC, add this game's origin to
					<code class="rounded bg-stone-200 px-1">JANUS_ALLOWED_ORIGINS</code>
					in
					<code class="rounded bg-stone-200 px-1">phone-app/.env</code>
					(e.g.
					<code class="rounded bg-stone-200 px-1">http://localhost:5173</code>).
				</p>
			</div>
		{/if}

		{#if testState === 'success'}
			<p class="text-sm font-medium text-emerald-700" role="status">Connected to your PC.</p>
		{/if}
		{#if testState === 'error' && testError}
			<p class="text-sm text-red-700" role="alert">{testError}</p>
		{/if}

		<div class="flex flex-col gap-2 pt-1">
			<button
				type="button"
				class="min-h-11 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={inputsDisabled || !baseUrl.trim() || !apiKey.trim()}
				onclick={ontest}
			>
				{testState === 'testing' ? 'Testing…' : 'Test connection'}
			</button>
			<button
				type="button"
				class="min-h-11 rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
				disabled={connectDisabled}
				onclick={onconnect}
			>
				Connect
			</button>
			<button
				type="button"
				class="min-h-11 rounded-lg bg-stone-200 px-4 py-2 font-medium text-stone-800 hover:bg-stone-300"
				onclick={oncancel}
			>
				Cancel
			</button>
		</div>

		<div class="border-t border-stone-200 pt-3">
			<p class="text-xs font-semibold tracking-wide text-stone-500 uppercase">Coming soon</p>
			<ul class="mt-1 space-y-1 text-sm text-stone-400">
				<li>OpenRouter</li>
				<li>OpenAI</li>
				<li>Art Dev Tycoon Cloud</li>
			</ul>
		</div>
	</div>
</div>
