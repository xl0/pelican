<script lang="ts">
import dbg from 'debug';
	const debug = dbg('app:DebugAsciiRender');
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { renderAsciiToSvg, asciiToPngBlob } from '$lib/svg';
	import { Bug, ChevronDown } from '@lucide/svelte';

	let open = $state(true);
	let pngUrl = $state('');

	const gen = $derived(app.currentGeneration);
	const isAscii = $derived(gen?.format === 'ascii');

	// Get current artifact from selected step
	const currentArtifact = $derived.by(() => {
		if (!gen?.steps?.length) return undefined;
		const step = gen.steps[app.selectedStepIndex ?? gen.steps.length - 1];
		const artifacts = step?.artifacts;
		if (!artifacts?.length) return undefined;
		return artifacts[app.selectedArtifactIndex ?? artifacts.length - 1];
	});

	// Auto-render current artifact to SVG
	const renderedSvg = $derived.by(() => {
		if (!isAscii || !currentArtifact?.body || !gen) return '';

		return renderAsciiToSvg(currentArtifact.body, gen.width, gen.height);
	});

	// Convert to PNG when SVG changes
	$effect(() => {
		if (!renderedSvg || !gen || !currentArtifact?.body) {
			if (pngUrl) URL.revokeObjectURL(pngUrl);
			pngUrl = '';
			return;
		}
		asciiToPngBlob(currentArtifact.body, gen.width, gen.height).then((blob) => {
			if (pngUrl) URL.revokeObjectURL(pngUrl);
			pngUrl = URL.createObjectURL(blob);
		});

		return () => {
			if (pngUrl) URL.revokeObjectURL(pngUrl);
		};
	});
</script>

{#if isAscii}
	<div class="border-t border-border mt-2 pt-2">
		<Button variant="ghost" size="sm" class="w-full justify-between h-6 px-2 text-xs text-muted-foreground" onclick={() => (open = !open)}>
			<span class="flex items-center gap-1">
				<Bug class="h-3 w-3" />
				Debug: ASCII Render
			</span>
			<ChevronDown class="h-3 w-3 transition-transform {open ? 'rotate-180' : ''}" />
		</Button>
		{#if open}
			<div class="mt-2">
				{#if renderedSvg}
					<div class="text-xs text-muted-foreground mb-1">
						Step {(app.selectedStepIndex ?? (gen?.steps?.length ?? 1) - 1) + 1}, Artifact {(app.selectedArtifactIndex ?? 0) + 1}
					</div>
					<div class="grid grid-cols-2 gap-2">
						<div>
							<div class="text-xs text-muted-foreground mb-1">SVG</div>
							{@html renderedSvg}
						</div>
						<div>
							<div class="text-xs text-muted-foreground mb-1">PNG</div>
							{#if pngUrl}
								<img src={pngUrl} alt="PNG render" class="w-full" />
							{:else}
								Loading...
							{/if}
						</div>
					</div>
					<details class="mt-2">
						<summary class="text-xs text-muted-foreground cursor-pointer hover:text-foreground">SVG Source</summary>
						<pre
							class="mt-1 p-2 text-[10px] leading-tight bg-muted/50 rounded border border-border overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">{renderedSvg}</pre>
					</details>
				{:else}
					<span class="text-xs text-muted-foreground">No artifact to render</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
