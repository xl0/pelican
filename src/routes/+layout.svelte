<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from 'svelte-sonner';
	import '../app.css';

	import { page } from '$app/state';
	import { app } from '$lib/appstate.svelte';

	import ArtifactPreview from '$lib/components/ArtifactPreview.svelte';
	import CostDisplay from '$lib/components/CostDisplay.svelte';
	import Header from '$lib/components/Header.svelte';
	import ModelSettings from '$lib/components/ModelSettings.svelte';
	import OutputSettings from '$lib/components/OutputSettings.svelte';
	import PromptInput from '$lib/components/PromptInput.svelte';
	import PromptTermplates from '$lib/components/PromptTermplates.svelte';
	import RawOutput from '$lib/components/RawOutput.svelte';
	import StepsHistory from '$lib/components/StepsHistory.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { getGeneration, updateGeneration } from '$lib/data.remote';
	import { generate } from '$lib/generate';
	import * as p from '$lib/persisted.svelte';
	import { BookType, ChevronDown, Link, SquareTerminal, WandSparkles } from '@lucide/svelte';
	import dbg from 'debug';
	import DebugAsciiRender from '$lib/components/DebugAsciiRender.svelte';
	import { dev } from '$app/environment';
	const debug = dbg('app:layout');

	let { data, children } = $props();

	// Routes that use the main generation UI
	const isMainRoute = $derived(page.route.id === '/' || page.route.id === '/[id]');

	// Compute cost totals for CostDisplay
	const costSteps = $derived(app.currentGeneration?.steps ?? []);
	const totalInputTokens = $derived(costSteps.reduce((sum, s) => sum + (s.inputTokens ?? 0), 0));
	const totalOutputTokens = $derived(costSteps.reduce((sum, s) => sum + (s.outputTokens ?? 0), 0));
	const totalInputCost = $derived(costSteps.reduce((sum, s) => sum + (s.inputCost ?? 0), 0));
	const totalOutputCost = $derived(costSteps.reduce((sum, s) => sum + (s.outputCost ?? 0), 0));

	// Current generating step (for live progress display)
	const generatingStepIdx = $derived(costSteps.findIndex((s) => s.status === 'generating'));
	const generatingStep = $derived(generatingStepIdx >= 0 ? costSteps[generatingStepIdx] : undefined);

	let generation = $derived.by(() => {
		if (!isMainRoute) return undefined;
		if (page.params.id) {
			return getGeneration({ id: page.params.id });
		}
	});

	// Initialize/update currentGeneration based on route
	$effect(() => {
		if (!isMainRoute) return; // Only touch currentGeneration on main routes

		if (generation) {
			// Loading an existing generation from DB
			generation.then((g) => {
				debug('generation loaded from DB', { g });
				app.currentGeneration = undefined;
				if (g) {
					// Flatten generationImages junction table to simple images array
					const { generationImages, ...rest } = g;
					app.currentGeneration = {
						...rest,
						images: generationImages.map((gi) => gi.image)
					};
					// Store original templates for reset functionality
					app.originalTemplates = {
						initial: g.initialTemplate,
						refinement: g.refinementTemplate
					};
				}
				app.selectedStepIndex = undefined;
				app.selectedArtifactIndex = undefined;
			});
		} else {
			// New generation mode - reset to persisted values
			debug('new generation mode');
			app.resetFromPersisted();
			app.selectedStepIndex = undefined;
			app.selectedArtifactIndex = undefined;
		}
	});
</script>

<Toaster richColors={false} theme="light" />

{#if isMainRoute}
	<div class="fixed inset-0 bg-background p-2 md:p-3 font-sans overflow-hidden flex flex-col">
		<div class="mx-auto w-full max-w-7xl gap-2 md:gap-3 flex flex-col flex-1 min-h-0">
			<div class="pb-2 border-b border-border">
				<Header isAdmin={data.user?.isAdmin ?? false} />
			</div>

			{#if app.currentGeneration}
				<!-- Mobile: stacked (preview on top, controls below). Desktop: side-by-side -->
				<div class="flex flex-col md:flex-row flex-1 min-h-0 gap-2 md:gap-1">
					<!-- Preview - Full width on mobile (hidden when showRaw), 2/3 or 1/2 on desktop -->
					<div
						class="order-1 md:order-2 flex md:flex-none transition-all duration-200 flex-col max-h-1/2 md:max-h-full min-h-[40vh] md:min-h-0 {p
							.showRawOutput.current && app.currentGeneration?.id
							? 'hidden md:flex md:w-1/2'
							: 'md:w-2/3'}">
						<div class="flex items-center justify-between h-6 shrink-0 px-1">
							<div class="flex items-center gap-2">
								<h2 class="text-sm font-bold text-foreground m-0">Preview</h2>
								<CostDisplay
									inputTokens={totalInputTokens}
									outputTokens={totalOutputTokens}
									inputCost={totalInputCost}
									outputCost={totalOutputCost} />
								{#if app.isGenerating && generatingStep}
									<span class="text-xs text-muted-foreground">
										Step {generatingStepIdx + 1}/{app.currentGeneration?.maxSteps} · ~{Math.floor(
											(generatingStep.rawOutput?.length ?? 0) / 4
										).toLocaleString()} tokens
									</span>
								{/if}
								<!-- ASCII Style toggle -->
								{#if app.currentGeneration?.format === 'ascii'}
									<Button
										variant="outline"
										size="sm"
										class="h-7 w-7 p-0 border-border rounded"
										style="background-color: var(--ascii-{p.asciiStyle.current}-bg); color: var(--ascii-{p.asciiStyle.current}-fg);"
										onclick={() => (p.asciiStyle.current = p.asciiStyle.current === 'crt' ? 'teletype' : 'crt')}>
										{#if p.asciiStyle.current === 'crt'}
											<SquareTerminal class="h-3.5 w-3.5" />
										{:else}
											<BookType class="h-3.5 w-3.5" />
										{/if}
									</Button>
								{/if}
							</div>
							<div class="flex items-center gap-2 md:gap-4">
								{#if app.currentGeneration && (!app.currentGeneration.id || app.currentGeneration.userId === data.user?.id) && data.user?.isRegistered}
									{@const gen = app.currentGeneration}
									<div class="flex items-center gap-2">
										<div class="flex items-center gap-2" title="Share link">
											{#if gen.access === 'shared' || gen.access === 'gallery'}
												<Button
													variant="ghost"
													size="icon"
													class=""
													title="Copy link"
													onclick={() => {
														navigator.clipboard.writeText(`${window.location.origin}/${gen.id}`);
														toast.success('Link copied to clipboard');
													}}>
													<Link class="h-3.5 w-3.5" />
												</Button>
											{/if}

											<Label for="shared-toggle" class="text-xs font-medium text-foreground">Share</Label>
											<Switch
												id="shared-toggle"
												checked={gen.access === 'shared' || gen.access === 'gallery'}
												onCheckedChange={async (checked) => {
													gen.access = checked ? 'shared' : 'private';
													if (gen.id) {
														await updateGeneration({ id: gen.id, access: gen.access });
													}
												}} />
										</div>
										<div class="flex items-center gap-2" title="Public gallery">
											<Label for="gallery-toggle" class="text-xs font-medium text-foreground">Gallery</Label>
											<Switch
												id="gallery-toggle"
												checked={gen.access === 'gallery'}
												onCheckedChange={async (checked) => {
													gen.access = checked ? 'gallery' : gen.access === 'gallery' ? 'shared' : gen.access;
													if (gen.id) {
														await updateGeneration({ id: gen.id, access: gen.access });
													}
												}} />
										</div>
									</div>
									<Separator orientation="vertical" class="h-4" />
								{/if}
								{#if !app.isGenerating && app.currentGeneration?.steps?.some((s) => s.rawOutput)}
									<Button variant="outline" class="text-xs h-6" onclick={() => (app.isStreaming ? app.stopStream() : app.simulateStream())}>
										{app.isStreaming ? 'Stop' : 'Stream'}
									</Button>
								{/if}
								<!-- Show Raw toggle - only when raw is not active (toggle to enable) -->
								{#if app.currentGeneration.id && !p.showRawOutput.current}
									<div class="flex items-center gap-2">
										<Label for="show-raw" class="text-xs font-medium text-foreground">Show Raw</Label>
										<Switch id="show-raw" bind:checked={p.showRawOutput.current} />
									</div>
								{/if}
							</div>
						</div>
						<div class="flex flex-col overflow-auto mt-2 h-full mb-auto">
							<ArtifactPreview />
							<StepsHistory />
						</div>
					</div>

					<!-- Controls - Full width on mobile (hidden when showRaw), 1/3 on desktop (order-1) -->
					<div
						class="order-2 md:order-1 overflow-y-auto transition-all duration-200 flex-1 md:flex-none {p.showRawOutput.current &&
						app.currentGeneration.id
							? 'hidden md:block md:w-0 md:opacity-0'
							: 'md:w-1/3 md:opacity-100'}"
						style="direction: rtl;">
						<div class="space-y-3 px-1 md:px-3 pb-3 min-w-0" style="direction: ltr;">
							<!-- Prompt Section (includes images) -->
							<PromptInput onsubmit={() => generate()} />

							<div class="pt-1">
								<Button
									class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm"
									disabled={app.isGenerating}
									onclick={() => generate()}>
									{#if app.isGenerating}
										<WandSparkles class="mr-2 h-4 w-4 animate-spin" />
										Generating...
									{:else}
										<WandSparkles class="mr-2 h-4 w-4" />
										Generate
									{/if}
								</Button>
							</div>

							<!-- Visibility controls for existing generations owned by registered users -->
							<!-- Visibility controls moved to preview header -->

							<Separator />

							<!-- Output Settings -->
							<OutputSettings />

							<Separator />

							<!-- ModelSettings -->
							<ModelSettings />

							<Separator />

							<!-- Prompt Templates (Collapsible) -->
							<Collapsible.Root bind:open={p.promptTemplatesOpen.current}>
								<Collapsible.Trigger
									class="flex items-center justify-between w-full py-1.5 px-2 bg-muted hover:bg-muted/80 transition-colors">
									<span class="text-xs font-semibold text-foreground">Prompt Templates</span>
									<ChevronDown class="h-3 w-3 transition-transform {p.promptTemplatesOpen.current ? 'rotate-180' : ''}" />
								</Collapsible.Trigger>

								<Collapsible.Content class="pt-3 space-y-3">
									<PromptTermplates />
								</Collapsible.Content>
							</Collapsible.Root>

							{#if dev}
								<DebugAsciiRender />
							{/if}
						</div>
					</div>

					<!-- Raw Output - Full screen on mobile when active, 1/2 on desktop -->
					<div
						class="order-3 overflow-hidden transition-all duration-200 flex-col {p.showRawOutput.current && app.currentGeneration?.id
							? 'flex flex-1 md:flex-none md:w-1/2 opacity-100'
							: 'hidden md:flex w-0 opacity-0'}">
						<div class="flex-1 min-h-0 flex flex-col min-w-0">
							<RawOutput />
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

{@render children()}
