<script lang="ts">
import dbg from 'debug';
	const debug = dbg('app:RawOutput');
	import { app } from '$lib/appstate.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import CostDisplay from '$lib/components/CostDisplay.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import * as ImageZoom from '$lib/components/ui/image-zoom';
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
	const mappedInputImages = $derived(
		inputImages.map((img) => ({
			src: getInputImageUrl(img.id, img.extension),
			alt: 'Input'
		}))
	);
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

	$effect(() => {
		if (p.showAllSteps.current && selectedIndex >= 0 && container) {
			// Small delay to let DOM update after toggling showAllSteps
			requestAnimationFrame(() => {
				const el = document.getElementById(`step-${selectedIndex}`);
				if (el) {
					el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				}
			});
		}
	});

	let container = $state<HTMLElement>();
</script>

{#snippet messageBlock(role: 'user' | 'assistant', label: string, text: string)}
	<div class="shrink-0">
		<div
			class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 {role === 'user'
				? 'text-user bg-user-bg'
				: 'text-assistant bg-assistant-bg'}">
			{label}
		</div>
		<div class="group relative border border-border overflow-hidden">
			<CopyButton {text} class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 z-10" />
			<CodeMirror value={text} theme={oneDark} editable={false} lineNumbers={true} extensions={[EditorView.lineWrapping]} />
		</div>
	</div>
{/snippet}

{#snippet imagesBlock(images: { src: string; alt: string }[], height: string = 'h-16')}
	{#if images.length > 0}
		<ImageZoom.Root>
			<div class="flex gap-2 flex-wrap">
				{#each images as img}
					<ImageZoom.Trigger src={img.src} alt={img.alt} class="{height} w-auto object-contain border border-border" />
				{/each}
			</div>
		</ImageZoom.Root>
	{/if}
{/snippet}

<div class="raw-output flex-1 h-0 flex flex-col gap-2">
	<!-- Controls -->
	<div class="flex flex-row items-center justify-between gap-2 shrink-0 px-1 pr-4 h-6">
		<div class="flex items-center gap-2">
			<Label for="show-all-steps" class="text-xs font-medium text-muted-foreground">All Steps</Label>
			<Switch id="show-all-steps" bind:checked={p.showAllSteps.current} />
		</div>
		<div class="flex items-center gap-2">
			<Label for="show-raw-output" class="text-xs font-medium text-foreground">Show Raw</Label>
			<Switch id="show-raw-output" bind:checked={p.showRawOutput.current} />
		</div>
	</div>

	<div class="flex-1 overflow-auto relative flex flex-col gap-3 min-h-0" bind:this={container}>
		{#if p.showAllSteps.current}
			<!-- All Steps View -->
			{#each steps as step, i}
				{@const isSelected = i === selectedIndex}
				{@const prev = i > 0 ? steps[i - 1] : undefined}
				{@const prevRenderedUrl = getStepRenderedUrl(prev)}
				<div id="step-{i}" class="flex flex-col gap-2 p-2 border shrink-0 {isSelected ? 'border-primary bg-primary/5' : 'border-border'}">
					<div class="flex justify-between items-center px-2">
						<span class="text-xs font-bold text-foreground">Step {i + 1}</span>
						<CostDisplay
							inputTokens={step.inputTokens ?? 0}
							outputTokens={step.outputTokens ?? 0}
							inputCost={step.inputCost ?? 0}
							outputCost={step.outputCost ?? 0} />
					</div>

					<!-- User message -->
					<div class="shrink-0">
						<div class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 text-user bg-user-bg">User</div>

						<div class="flex items-center gap-2 mt-1">
							{#if mappedInputImages.length > 0}
								{@render imagesBlock(mappedInputImages, 'h-20')}
							{/if}
							{#if mappedInputImages.length > 0 && prevRenderedUrl}
								<Separator orientation="vertical" class="h-20!" />
							{/if}
							{#if prevRenderedUrl}
								{@render imagesBlock([{ src: prevRenderedUrl, alt: `Rendered Step ${i}` }], 'h-20')}
							{/if}
						</div>
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

				<!-- Step header -->
				<div class="flex justify-between items-center px-2 shrink-0">
					<span class="text-xs font-bold text-foreground">Step {selectedIndex + 1}</span>
					<CostDisplay
						inputTokens={currentStep.inputTokens ?? 0}
						outputTokens={currentStep.outputTokens ?? 0}
						inputCost={currentStep.inputCost ?? 0}
						outputCost={currentStep.outputCost ?? 0} />
				</div>

				<!-- User message -->
				<div class="shrink-0">
					<div class="text-xs font-bold uppercase tracking-wide px-2 py-1 mb-1 text-user bg-user-bg">User</div>
					{#if isRefinement && currentStep.renderedPrompt}
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

					<div class="flex items-start gap-2 mt-1">
						{#if mappedInputImages.length > 0}
							{@render imagesBlock(mappedInputImages, 'h-20')}
						{/if}
						{#if mappedInputImages.length > 0 && prevStepRenderedUrl}
							<Separator orientation="vertical" class="h-20!" />
						{/if}
						{#if prevStepRenderedUrl}
							{@render imagesBlock([{ src: prevStepRenderedUrl, alt: `Rendered Step ${selectedIndex}` }], 'h-20')}
						{/if}
					</div>
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
					{@render messageBlock('assistant', `Assistant`, currentStep.rawOutput)}
				{/if}
			{:else}
				<div class="text-sm text-muted-foreground p-3">No step selected</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.raw-output :global(.cm-editor) {
		font-size: 0.75rem;
	}
</style>
