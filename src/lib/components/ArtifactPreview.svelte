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
</script>

<div
	class="group grow-0 flex items-center justify-center border border-border relative overflow-hidden select-text [&>svg]:w-full [&>svg]:h-auto">
	{#if currentArtifact?.body}
		<CopyButton text={currentArtifact.body} class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 z-10" />
		{#if app.currentGeneration?.format === 'svg'}
			{@html currentArtifact.body}
		{:else}
			<div class="w-full h-full" style="background-color: {p.asciiBgColor.current}; color: {p.asciiFgColor.current}">
				<AsciiArt
					text={currentArtifact.body}
					rows={app.currentGeneration?.height}
					cols={app.currentGeneration?.width}
					grid={true}
					frame={true}
					margin={1}
					class="w-full h-full"
					gridClass="ascii-grid"
					frameClass="ascii-frame" />
			</div>
		{/if}
	{:else}
		<div class="text-center space-y-2 text-muted-foreground">
			<ImageIcon class="h-12 w-12 mx-auto mb-3 opacity-30" />
			<p class="text-sm font-medium">No image generated yet</p>
		</div>
	{/if}
</div>
