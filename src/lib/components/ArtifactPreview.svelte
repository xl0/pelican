<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import * as p from '$lib/persisted.svelte';
	import { ImageIcon } from '@lucide/svelte';
	import { AsciiArt } from 'svelte-asciiart';

	// Get the current artifact to display
	const currentArtifact = $derived.by(() => {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return undefined;
		const step = steps[app.selectedStepIndex ?? steps.length - 1];
		const artifacts = step?.artifacts;
		if (!artifacts?.length) return undefined;
		return artifacts[app.selectedArtifactIndex ?? artifacts.length - 1];
	});

	const gen = $derived(app.currentGeneration);
	const body = $derived(currentArtifact?.body ?? '');
</script>

<!--  -->
<div class="group flex items-center justify-center border border-border relative overflow-hidden select-text [&>svg]:w-full [&>svg]:h-auto">
	{#if body}
		<CopyButton text={body} class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10" />
	{/if}
	{#if gen?.format === 'ascii'}
		<div class="w-full h-full" style="background-color: {p.asciiBgColor.current}; color: {p.asciiFgColor.current}">
			<AsciiArt
				text={body}
				rows={gen.height}
				cols={gen.width}
				grid={true}
				frame={true}
				margin={1}
				class="w-full h-full"
				gridClass="ascii-grid"
				frameClass="ascii-frame" />
		</div>
	{/if}
	{#if gen?.format === 'svg'}
		{#if body}
			{@html body}
		{:else}
			<div
				class="w-full flex flex-col justify-center items-center text-muted-foreground {app.isGenerating ? 'animate-spin-slow' : ''}"
				style="aspect-ratio: {gen.width} / {gen.height};">
				<ImageIcon class="h-48 w-48 opacity-30 stroke-1" />
				{app.isGenerating ? 'Generating...' : 'Generate an image'}
			</div>
		{/if}
	{/if}
</div>

<style>
	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.animate-spin-slow {
		animation: spin-slow 4s linear infinite;
	}
</style>
