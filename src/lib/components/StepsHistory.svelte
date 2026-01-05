<script lang="ts">
	import dbg from 'debug';
	const debug = dbg('app:StepsHistory');
	import { app, type CurrentGeneration } from '$lib/appstate.svelte';
	import AsciiRenderer from './AsciiRenderer.svelte';
	import { Loader2, AlertCircle } from '@lucide/svelte';

	// Derive steps with artifacts (add fake placeholder if empty)
	type ArtifactDisplay = { body?: string; isFake?: boolean };
	type StepDisplay = {
		step: CurrentGeneration['steps'][number];
		stepIdx: number;
		artifacts: ArtifactDisplay[];
	};

	const stepsWithArtifacts = $derived.by((): StepDisplay[] => {
		const gen = app.currentGeneration;
		if (!gen?.steps?.length) return [];
		return gen.steps.map((step, stepIdx) => {
			const arts: ArtifactDisplay[] = step.artifacts?.length
				? step.artifacts.map((a) => ({ body: a.body ?? undefined }))
				: [{ isFake: true }];
			return { step, stepIdx, artifacts: arts };
		});
	});

	// Find failed step for error display
	const failedStep = $derived(app.currentGeneration?.steps?.find((s) => s.status === 'failed'));

	// Helper: check if step at index is selected (or last step if none selected)
	function isStepSelected(index: number): boolean {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return false;
		return app.selectedStepIndex === index || (app.selectedStepIndex === undefined && index === steps.length - 1);
	}

	// Helper: get the artifact index to highlight for a step
	function isArtifactSelected(stepDisplay: StepDisplay, artIdx: number): boolean {
		const { step, stepIdx } = stepDisplay;
		if (!isStepSelected(stepIdx)) return false;
		return app.selectedArtifactIndex === artIdx || (app.selectedArtifactIndex === undefined && artIdx === stepDisplay.artifacts.length - 1);
	}
</script>

{#if stepsWithArtifacts.length}
	<div class="flex flex-col gap-2">
		<div class="flex gap-3 overflow-x-auto pb-2 border-border pt-2 pl-0.5 shrink-0">
			{#each stepsWithArtifacts as stepDisplay}
				{@const { step, stepIdx, artifacts } = stepDisplay}
				<div class="flex flex-col gap-1 shrink-0">
					{#each artifacts as artifact, artIdx}
						{@const isLast = artIdx === artifacts.length - 1}
						{@const showSpinner = step.status === 'generating' && isLast}
						<button
							class="relative h-16 border overflow-hidden transition-all hover:ring-1 hover:ring-primary focus:outline-none {isArtifactSelected(
								stepDisplay,
								artIdx
							)
								? 'ring-2 ring-primary border-primary'
								: 'border-border'}"
							style="aspect-ratio: {app.currentGeneration?.width ?? 1} / {app.currentGeneration?.height ?? 1};"
							onclick={() => {
								app.selectedStepIndex = stepIdx;
								app.selectedArtifactIndex = artIdx;
							}}>
							{#if artifact.body}
								{#if app.currentGeneration?.format === 'svg'}
									<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full flex items-center justify-center bg-card pointer-events-none">
										{@html artifact.body}
									</div>
								{:else}
									<div class="w-full h-full pointer-events-none">
										<AsciiRenderer
											text={artifact.body}
											rows={app.currentGeneration?.height ?? 24}
											cols={app.currentGeneration?.width ?? 80}
											fontWeight="900"
											textStrokeWidth="0.2px" />
									</div>
								{/if}
							{:else}
								<div class="w-full h-full bg-muted flex items-center justify-center">
									<span class="text-2xl font-bold text-muted-foreground/40">{stepIdx + 1}</span>
								</div>
							{/if}
							<!-- Step number overlay -->
							{#if artifact.body}
								<span
									class="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold pointer-events-none select-none opacity-40"
									style="text-shadow: 0 0 4px black;">
									{stepIdx + 1}
								</span>
							{/if}
							<!-- Spinner overlay for generating -->
							{#if showSpinner}
								<div class="absolute inset-0 bg-background/60 flex items-center justify-center">
									<Loader2 class="h-6 w-6 animate-spin text-primary" />
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/each}
		</div>
		<!-- Error message below history -->
		{#if failedStep?.errorMessage}
			<div class="flex items-center gap-2 text-destructive text-sm px-1">
				<AlertCircle class="h-4 w-4 shrink-0" />
				<span>{failedStep.errorMessage}</span>
			</div>
		{/if}
	</div>
{/if}
