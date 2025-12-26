<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	let { onsubmit } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			if (!app.isGenerating && onsubmit) {
				onsubmit();
			}
		}
	}
</script>

<div class="space-y-1.5">
	<Label for="prompt" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Prompt</Label>
	{#if app.currentGeneration}
		<Textarea
			id="prompt"
			placeholder="Describe what you want to see..."
			class="min-h-[60px] resize-none border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500 text-sm"
			bind:value={app.currentGeneration.prompt}
			onkeydown={handleKeydown} />
	{/if}
</div>
