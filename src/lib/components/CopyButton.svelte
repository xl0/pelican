<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';

	let { text, class: className = '' }: { text: string | undefined; class?: string } = $props();

	let copied = $state(false);

	async function handleCopy() {
		if (!text) return;
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1000);
	}
</script>

<button
	class="p-1.5 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all {className}"
	onclick={handleCopy}
	disabled={!text}
	title="Copy to clipboard">
	{#if copied}
		<Check class="h-4 w-4 text-emerald-400" />
	{:else}
		<Copy class="h-4 w-4" />
	{/if}
</button>