<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import '../app.css';

	import { page } from '$app/state';
	import { app } from '$lib/appstate.svelte';
	import ArtifactPreview from '$lib/components/ArtifactPreview.svelte';
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
	import { getGeneration } from '$lib/data.remote';
	import { generate } from '$lib/generate';
	import * as p from '$lib/persisted.svelte';
	import { ChevronDown, CircleAlert, WandSparkles } from '@lucide/svelte';
	import dbg from 'debug';
	import { resolve } from '$app/paths';

	const debug = dbg('app:layout');

	let { data, children } = $props();

	// Routes that bypass the main generation UI
	const isSpecialRoute = $derived(page.route.id === '/gallery' || page.route.id === '/history');

	let generation = $derived.by(() => {
		if (isSpecialRoute) return undefined;
		if (page.params.id) {
			return getGeneration({ id: page.params.id });
		}
	});

	// Initialize/update currentGeneration based on route
	$effect(() => {
		if (isSpecialRoute) return; // Don't touch currentGeneration on special routes


		if (generation) {
			// Loading an existing generation from DB
			generation.then((g) => {
				debug('generation loaded from DB', { g });
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
				} else {
					app.currentGeneration = undefined;
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

{#if !isSpecialRoute}
	<div class="fixed inset-0 bg-background p-2 md:p-3 font-sans overflow-hidden flex flex-col">
		<div class="mx-auto w-full max-w-7xl gap-2 md:gap-3 flex flex-col flex-1 min-h-0">
			<header class="flex items-center justify-between pb-2 border-b border-border">
				<div>
					<a href={resolve('/')}>
						<h1 class="text-2xl md:text-3xl font-black tracking-tight text-primary">Pelican</h1>
					</a>
				</div>
				<nav class="flex items-center gap-4">
					<a
						href={resolve('/')}
						class="text-sm font-medium {page.route.id === '/' || page.route.id === '/[id]'
							? 'text-primary'
							: 'text-muted-foreground hover:text-primary transition-colors'}">
						Create
					</a>
					<a
						href={resolve('/history')}
						class="text-sm font-medium {page.route.id === '/history'
							? 'text-primary'
							: 'text-muted-foreground hover:text-primary transition-colors'}">
						History
					</a>
					<a
						href={resolve('/gallery')}
						class="text-sm font-medium {page.route.id === '/gallery'
							? 'text-primary'
							: 'text-muted-foreground hover:text-primary transition-colors'}">
						Gallery
					</a>
				</nav>
			</header>

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
							<h2 class="text-sm font-bold text-foreground m-0">Preview</h2>
							<div class="flex items-center gap-2 md:gap-4">
								{#if app.currentGeneration?.format === 'ascii'}
									<div class="flex items-center gap-1 md:gap-2">
										<Label for="ascii-fg" class="text-xs font-medium text-foreground">FG</Label>
										<input
											id="ascii-fg"
											type="color"
											bind:value={p.asciiFgColor.current}
											class="w-6 h-6 cursor-pointer border-0 p-0 bg-transparent" />
										<Label for="ascii-bg" class="text-xs font-medium text-foreground">BG</Label>
										<input
											id="ascii-bg"
											type="color"
											bind:value={p.asciiBgColor.current}
											class="w-6 h-6 cursor-pointer border-0 p-0 bg-transparent" />
									</div>
								{/if}
								{#if !app.isGenerating && app.currentGeneration?.steps?.some((s) => s.rawOutput)}
									<Button
										variant="outline"
										class="h-fit text-xs px-1 py-0"
										onclick={() => (app.isStreaming ? app.stopStream() : app.simulateStream())}>
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
							<PromptInput onsubmit={() => generate(data.user.id)} />

							<div class="pt-1">
								<Button
									class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm"
									disabled={app.isGenerating}
									onclick={() => generate(data.user.id)}>
									{#if app.isGenerating}
										<WandSparkles class="mr-2 h-4 w-4 animate-spin" />
										Generating...
									{:else}
										<WandSparkles class="mr-2 h-4 w-4" />
										Generate
									{/if}
								</Button>
							</div>

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

							<!-- Cost Display -->
							<!-- <CostDisplay /> -->
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
