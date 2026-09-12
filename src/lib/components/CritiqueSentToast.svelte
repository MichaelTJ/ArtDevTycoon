<script lang="ts">
	interface Props {
		clientName: string;
	}

	let { clientName }: Props = $props();
</script>

<div class="critique-sent" role="status" aria-live="polite">
	<p class="title">Sent for critique</p>
	<p class="body">Sending your painting to {clientName} for a critique.</p>
</div>

<style>
	.critique-sent {
		position: fixed;
		top: 5rem;
		left: 50%;
		z-index: 45;
		box-sizing: border-box;
		width: min(22rem, calc(100vw - 2rem));
		padding: 0.75rem 1rem;
		border: 1px solid #fcd34d;
		border-radius: 0.75rem;
		background: #fffbeb;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.12);
		transform: translateX(-50%);
		pointer-events: none;
	}

	.title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #292524;
	}

	.body {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		line-height: 1.35;
		color: #44403c;
	}
</style>
