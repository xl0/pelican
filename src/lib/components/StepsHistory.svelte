<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { AsciiArt } from 'svelte-asciiart';

	// Helper: check if step at index is selected (or last step if none selected)
	function isStepSelected(index: number): boolean {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return false;
		return app.selectedStepIndex === index || (app.selectedStepIndex === undefined && index === steps.length - 1);
	}
</script>

{#if app.currentGeneration?.steps?.length}
	<div class="flex gap-3 overflow-x-auto pb-2 border-t border-border pt-2">
		{#each app.currentGeneration.steps as step, stepIdx}
			<div class="flex flex-col gap-1 shrink-0">
				<span class="text-[10px] font-bold text-muted-foreground text-center">Step {stepIdx + 1}</span>
				<div class="flex flex-col gap-1">
					{#each step.artifacts ?? [] as artifact, artIdx}
						<button
							class="relative w-16 h-16 border overflow-hidden transition-all hover:ring-1 hover:ring-orange-500 focus:outline-none {isStepSelected(
								stepIdx
							) &&
							(app.selectedArtifactIndex === artIdx ||
								(app.selectedArtifactIndex === undefined && artIdx === (step.artifacts?.length ?? 1) - 1))
								? 'ring-2 ring-orange-500 border-orange-500'
								: 'border-border'}"
							onclick={() => {
								app.selectedStepIndex = stepIdx;
								app.selectedArtifactIndex = artIdx;
							}}>
							{#if artifact.body}
								{#if app.currentGeneration.format === 'svg'}
									<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full flex items-center justify-center bg-white pointer-events-none">
										{@html artifact.body}
									</div>
								{:else}
									<div class="w-full h-full pointer-events-none">
										<AsciiArt
											text={artifact.body ?? ''}
											rows={app.currentGeneration.height}
											cols={app.currentGeneration.width}
											frame={true}
											margin={1}
											class="w-full h-full"
											 />
									</div>
								{/if}
							{:else}
								<div class="w-full h-full bg-muted animate-pulse"></div>
							{/if}
							<span class="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-0.5 font-medium">
								{artIdx + 1}
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
