<script lang="ts">
import dbg from 'debug';
	const debug = dbg('app:CopyButton');
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
	class="p-1.5 bg-secondary/80 hover:bg-secondary text-secondary-foreground/80 hover:text-secondary-foreground transition-all {className}"
	onclick={handleCopy}
	disabled={!text}
	title="Copy to clipboard">
	{#if copied}
		<Check class="h-4 w-4 text-success" />
	{:else}
		<Copy class="h-4 w-4" />
	{/if}
</button>
