<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import * as p from '$lib/persisted.svelte';
	import { getInputImageUrl, getRenderedArtifactUrl } from '$lib/utils';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { EditorView } from '@codemirror/view';
	import CodeMirror from 'svelte-codemirror-editor';

	const generationId = $derived(app.currentGeneration?.id);
	const steps = $derived(app.currentGeneration?.steps ?? []);
	const selectedIndex = $derived(app.selectedStepIndex ?? steps.length - 1);
	const currentStep = $derived(steps[selectedIndex]);
	const prevStep = $derived(selectedIndex > 0 ? steps[selectedIndex - 1] : undefined);
	const inputImages = $derived(app.currentGeneration?.images ?? []);
	const isRefinement = $derived(selectedIndex > 0);

	// Get URL of last rendered artifact from a step (if any)
	function getStepRenderedUrl(step: (typeof steps)[number] | undefined): string | undefined {
		if (!step?.id || !generationId) return undefined;
		// Find last artifact without renderError (successfully rendered)
		const artifacts = step.artifacts ?? [];
		for (let i = artifacts.length - 1; i >= 0; i--) {
			const art = artifacts[i];
			if (!art.renderError && art.id) {
				return getRenderedArtifactUrl(generationId, step.id, art.id);
			}
		}
		return undefined;
	}
</script>

{#snippet messageBlock(role: 'user' | 'assistant', label: string, text: string)}
	<div class="shrink-0">
		<div
			class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 {role === 'user'
				? 'text-blue-600 bg-blue-500/10'
				: 'text-green-600 bg-green-500/10'}">
			{label}
		</div>
		<div class="group relative border border-border overflow-hidden">
			<CopyButton {text} class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 z-10" />
			<CodeMirror value={text} theme={oneDark} editable={false} lineNumbers={true} extensions={[EditorView.lineWrapping]} />
		</div>
	</div>
{/snippet}

{#snippet imagesBlock(images: typeof inputImages, height: string = 'h-16')}
	{#if images.length > 0}
		<div class="flex gap-2 flex-wrap px-2">
			{#each images as img}
				<img src={getInputImageUrl(img.id, img.extension)} alt="Input" class="{height} w-auto object-contain border border-border" />
			{/each}
		</div>
	{/if}
{/snippet}

<div class="raw-output flex-1 h-0 flex flex-col gap-3 overflow-auto">
	<!-- Controls -->
	<div class="flex items-center justify-end gap-2 shrink-0">
		<Label for="show-all-steps" class="text-xs font-medium text-muted-foreground">All Steps</Label>
		<Switch id="show-all-steps" bind:checked={p.showAllSteps.current} />
	</div>

	{#if p.showAllSteps.current}
		<!-- All Steps View -->
		{#each steps as step, i}
			{@const isSelected = i === selectedIndex}
			{@const prev = i > 0 ? steps[i - 1] : undefined}
			{@const prevRenderedUrl = getStepRenderedUrl(prev)}
			<div class="flex flex-col gap-2 p-2 border shrink-0 {isSelected ? 'border-orange-500 bg-orange-500/5' : 'border-border'}">
				<div class="text-xs font-bold text-foreground px-2">Step {i + 1}</div>

				<!-- For refinement steps, show previous Assistant output -->
				<!-- {#if i > 0 && prev?.rawOutput}
					{@render messageBlock('assistant', `Assistant (Step ${i})`, prev.rawOutput)}
				{/if} -->

				<!-- User message -->
				<div class="shrink-0">
					<div class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 text-blue-600 bg-blue-500/10">User</div>
					{@render imagesBlock(inputImages)}
					<!-- Rendered image from previous step (for refinement) -->
					{#if prevRenderedUrl}
						<div class="px-2 mt-1">
							<div class="text-xs text-muted-foreground mb-1">Rendered Step {i}</div>
							<img src={prevRenderedUrl} alt="Rendered Step {i}" class="h-24 w-auto object-contain border border-border" />
						</div>
					{/if}
					{#if step.renderedPrompt}
						<div class="group relative border border-border overflow-hidden mt-1">
							<CopyButton text={step.renderedPrompt} class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 z-10" />
							<CodeMirror
								value={step.renderedPrompt}
								theme={oneDark}
								editable={false}
								lineNumbers={true}
								extensions={[EditorView.lineWrapping]} />
						</div>
					{/if}
				</div>

				<!-- Assistant response -->
				{#if step.rawOutput}
					{@render messageBlock('assistant', `Assistant (Step ${i + 1})`, step.rawOutput)}
				{/if}
			</div>
		{:else}
			<div class="text-sm text-muted-foreground p-3">No steps yet</div>
		{/each}
	{:else}
		<!-- Single Step View -->
		{#if currentStep}
			{@const prevStepRenderedUrl = getStepRenderedUrl(prevStep)}
			<!-- For refinement steps, show previous Assistant output first -->

			<!-- User message -->
			<div class="shrink-0">
				<div class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 text-blue-600 bg-blue-500/10">
					User (Step {selectedIndex + 1})
				</div>
				{#if currentStep.renderedPrompt}
					<div class="group relative border border-border overflow-hidden mt-1">
						<CopyButton text={currentStep.renderedPrompt} class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 z-10" />
						<CodeMirror
							value={steps[0].renderedPrompt}
							theme={oneDark}
							editable={false}
							lineNumbers={true}
							extensions={[EditorView.lineWrapping]} />
					</div>
				{/if}

				{@render imagesBlock(inputImages, 'h-20')}
				<!-- Rendered image from previous step (for refinement) -->
				{#if prevStepRenderedUrl}
					<div class="px-2 mt-1">
						<div class="text-xs text-muted-foreground mb-1">Rendered Step {selectedIndex}</div>
						<img src={prevStepRenderedUrl} alt="Rendered Step {selectedIndex}" class="h-32 w-auto object-contain border border-border" />
					</div>
				{/if}
				{#if currentStep.renderedPrompt}
					<div class="group relative border border-border overflow-hidden mt-1">
						<CopyButton text={currentStep.renderedPrompt} class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 z-10" />
						<CodeMirror
							value={currentStep.renderedPrompt}
							theme={oneDark}
							editable={false}
							lineNumbers={true}
							extensions={[EditorView.lineWrapping]} />
					</div>
				{/if}
			</div>

			<!-- Current step's Assistant response -->
			{#if currentStep.rawOutput}
				{@render messageBlock('assistant', `Assistant (Step ${selectedIndex + 1})`, currentStep.rawOutput)}
			{/if}
		{:else}
			<div class="text-sm text-muted-foreground p-3">No step selected</div>
		{/if}
	{/if}
</div>

<style>
	.raw-output :global(.cm-editor) {
		font-size: 0.75rem;
	}
</style>
