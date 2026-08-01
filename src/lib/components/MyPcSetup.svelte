<script lang="ts">
	type ProviderId = 'januslink' | 'ollama' | 'lmstudio' | 'automatic1111' | 'openrouter' | 'openai';
	type CritiqueProviderId = 'ollama' | 'lmstudio';

	interface Props {
		provider?: ProviderId;
		baseUrl?: string;
		apiKey?: string;
		generateModel?: string;
		critiqueModel?: string;
		critiqueProvider?: CritiqueProviderId;
		critiqueBaseUrl?: string;
		availableModels?: string[];
		testState?: 'idle' | 'testing' | 'success' | 'error';
		testError?: string | null;
		onproviderchange?: (provider: ProviderId) => void;
		onrefreshmodels: () => void;
		ontest: () => void;
		onconnect: () => void;
		oncancel: () => void;
	}

	let {
		provider = $bindable<ProviderId>('januslink'),
		baseUrl = $bindable(''),
		apiKey = $bindable(''),
		generateModel = $bindable(''),
		critiqueModel = $bindable(''),
		critiqueProvider = $bindable<CritiqueProviderId>('ollama'),
		critiqueBaseUrl = $bindable('http://localhost:11434'),
		availableModels = [],
		testState = 'idle',
		testError = null,
		onproviderchange,
		onrefreshmodels,
		ontest,
		onconnect,
		oncancel
	}: Props = $props();

	let helpOpen = $state(false);

	const connectDisabled = $derived(testState !== 'success');
	const inputsDisabled = $derived(testState === 'testing');
	const showModelFields = $derived(provider !== 'januslink');
	const showApiKeyRequired = $derived(
		provider === 'januslink' || provider === 'openrouter' || provider === 'openai'
	);
	const showCloudWarning = $derived(provider === 'openrouter' || provider === 'openai');
	const showA1111Critique = $derived(provider === 'automatic1111');
	const baseUrlPlaceholder = $derived.by(() => {
		if (provider === 'januslink') {
			return 'https://your-pc.tailnet-xxxx.ts.net';
		}
		if (provider === 'openrouter') {
			return 'https://openrouter.ai/api/v1';
		}
		if (provider === 'openai') {
			return 'https://api.openai.com/v1';
		}
		if (provider === 'lmstudio') {
			return 'http://localhost:1234';
		}
		if (provider === 'automatic1111') {
			return 'http://127.0.0.1:7860';
		}
		return 'http://localhost:11434';
	});

	const testDisabled = $derived.by(() => {
		if (inputsDisabled || !baseUrl.trim()) {
			return true;
		}
		if (provider === 'januslink') {
			return !apiKey.trim();
		}
		if (provider === 'openrouter' || provider === 'openai') {
			return !apiKey.trim() || !generateModel.trim() || !critiqueModel.trim();
		}
		if (provider === 'automatic1111') {
			return !critiqueModel.trim() || !critiqueBaseUrl.trim();
		}
		return !generateModel.trim() || !critiqueModel.trim();
	});

	function handleProviderInput(event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value as ProviderId;
		provider = value;
		onproviderchange?.(value);
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="my-pc-setup-title"
>
	<div
		class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-stone-300 bg-white p-6 shadow-lg"
	>
		<h2 id="my-pc-setup-title" class="text-xl font-bold text-stone-800">Connect My PC</h2>
		<p class="text-sm text-stone-600">
			Connect JanusLink, Ollama, LM Studio, or Automatic1111 on your machine — or bring your own
			OpenRouter / OpenAI key. Pick an image model and a vision critic when the stack needs it.
		</p>

		<label class="block text-sm font-medium text-stone-800">
			Provider
			<select
				class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				disabled={inputsDisabled}
				value={provider}
				onchange={handleProviderInput}
			>
				<option value="januslink">JanusLink</option>
				<option value="ollama">Ollama</option>
				<option value="lmstudio">LM Studio</option>
				<option value="automatic1111">Automatic1111</option>
				<option value="openrouter">OpenRouter</option>
				<option value="openai">OpenAI</option>
			</select>
		</label>

		<label class="block text-sm font-medium text-stone-800">
			{provider === 'januslink' ? 'PC Tailscale URL' : 'Base URL'}
			<input
				type="url"
				class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				placeholder={baseUrlPlaceholder}
				autocomplete="off"
				disabled={inputsDisabled}
				bind:value={baseUrl}
			/>
		</label>

		<label class="block text-sm font-medium text-stone-800">
			API key{showApiKeyRequired ? '' : ' (optional)'}
			<input
				type="password"
				class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
				placeholder={provider === 'januslink'
					? 'JANUS_API_KEY from the installer'
					: showCloudWarning
						? 'Your API key'
						: 'Leave blank unless your server requires auth'}
				autocomplete="off"
				disabled={inputsDisabled}
				bind:value={apiKey}
			/>
		</label>

		{#if showModelFields}
			<label class="block text-sm font-medium text-stone-800">
				Generation model
				<input
					type="text"
					list="adt-remote-models"
					class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					placeholder="Image model id"
					autocomplete="off"
					disabled={inputsDisabled}
					bind:value={generateModel}
				/>
			</label>

			<label class="block text-sm font-medium text-stone-800">
				Critique model
				<input
					type="text"
					list="adt-remote-models"
					class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					placeholder="Vision model id"
					autocomplete="off"
					disabled={inputsDisabled}
					bind:value={critiqueModel}
				/>
			</label>

			<button
				type="button"
				class="text-left text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
				disabled={inputsDisabled}
				onclick={onrefreshmodels}
			>
				Refresh models
			</button>

			<datalist id="adt-remote-models">
				{#each availableModels as model (model)}
					<option value={model}></option>
				{/each}
			</datalist>
		{/if}

		{#if showA1111Critique}
			<label class="block text-sm font-medium text-stone-800">
				Critique provider
				<select
					class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					disabled={inputsDisabled}
					bind:value={critiqueProvider}
				>
					<option value="ollama">Ollama</option>
					<option value="lmstudio">LM Studio</option>
				</select>
			</label>

			<label class="block text-sm font-medium text-stone-800">
				Critique base URL
				<input
					type="url"
					class="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					autocomplete="off"
					disabled={inputsDisabled}
					bind:value={critiqueBaseUrl}
				/>
			</label>
		{/if}

		{#if showCloudWarning}
			<p class="rounded-lg bg-amber-50 p-3 text-sm text-stone-700" role="note">
				Your API key is stored in this browser's localStorage and sent only to the provider you
				configure. Anyone with access to this device can read it. Clear it anytime with Disconnect
				settings (or clear site data).
			</p>
		{/if}

		{#if provider === 'januslink'}
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
				<div class="space-y-2 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
					<p>
						Install and run
						<a
							class="font-medium text-amber-800 underline"
							href="https://github.com/MichaelTJ/ADTLocalServe"
							target="_blank"
							rel="noopener noreferrer">JanusLink (ADTLocalServe)</a
						>
						on your GPU PC (<code class="rounded bg-stone-200 px-1">installer/install.ps1</code>
						or manual
						<code class="rounded bg-stone-200 px-1">janus-api</code>
						+
						<code class="rounded bg-stone-200 px-1">phone-app</code>).
					</p>
					<p>
						Join this phone or laptop to the
						<strong class="font-medium text-stone-700">same Tailscale</strong>
						tailnet as the PC. Copy the Tailscale HTTPS base URL (e.g.
						<code class="rounded bg-stone-200 px-1">https://pc-name.tailnet-xxxx.ts.net</code>) and
						<code class="rounded bg-stone-200 px-1">JANUS_API_KEY</code>
						from the installer /
						<code class="rounded bg-stone-200 px-1">.env</code>.
					</p>
					<p>
						On the PC, add this game's origin to
						<code class="rounded bg-stone-200 px-1">JANUS_ALLOWED_ORIGINS</code>
						in
						<code class="rounded bg-stone-200 px-1">phone-app/.env</code>
						(e.g.
						<code class="rounded bg-stone-200 px-1">http://localhost:5173</code>), then Test
						connection → Connect.
					</p>
				</div>
			{/if}
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
				disabled={testDisabled}
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
				<li>ComfyUI</li>
				<li>Art Dev Tycoon Cloud</li>
			</ul>
		</div>
	</div>
</div>
