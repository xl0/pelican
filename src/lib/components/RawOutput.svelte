<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';

	// Get the rawOutput of the selected step
	const currentStep = $derived.by(() => {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return undefined;
		return steps[app.selectedStepIndex ?? steps.length - 1];
	});

	const rawOutput = $derived(currentStep?.rawOutput ?? '');
</script>

<div class="group flex-1 flex flex-col border border-border relative overflow-hidden">
	<CopyButton text={rawOutput} class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10" />
	<pre class="flex-1 p-3 overflow-auto text-xs font-mono bg-muted text-foreground whitespace-pre select-text">{rawOutput}</pre>
</div>
