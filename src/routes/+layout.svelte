<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import '../app.css';

	import { page } from '$app/state';
	import { app } from '$lib/appstate.svelte';
	import ArtifactPreview from '$lib/components/ArtifactPreview.svelte';
	import InputImagesPreview from '$lib/components/InputImagesPreview.svelte';
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
	import * as p from '$lib/persisted.svelte';
	import { ChevronDown, CircleAlert, WandSparkles } from '@lucide/svelte';
	import dbg from 'debug';
	import { resolve } from '$app/paths';

	const debug = dbg('app:layout');

	let { data, children } = $props();

	// Local UI state
	let promptTemplatesOpen = $state(false);

	// Raw output viewing
	let showRawOutput = $state(false);

	// Routes that bypass the main generation UI
	const isPublic = $derived(page.route.id === '/public');

	let generation = $derived.by(() => {
		if (isPublic) return undefined;
		if (page.params.id) {
			return getGeneration({ id: page.params.id });
		}
	});

	// Initialize/update currentGeneration based on route
	$effect(() => {
		if (isPublic) return; // Don't touch currentGeneration on special routes

		if (generation) {
			// Loading an existing generation from DB
			generation.then((g) => {
				debug('generation loaded from DB', { g });
				app.currentGeneration = g;
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

<Toaster />

{#if !isPublic}
	<div class="min-h-screen bg-background p-3 font-sans">
		<div class="mx-auto max-w-7xl space-y-3">
			<header class="flex items-center justify-between pb-3 border-b border-border">
				<div>
					<h1
						class="text-3xl font-black tracking-tight bg-linear-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
						Pelican
					</h1>
					<p class="text-xs text-muted-foreground">AI-powered SVG and ASCII art generator</p>
				</div>
				<div class="flex items-center gap-2">
					<a href={resolve('/public')} class="text-xs font-medium text-muted-foreground hover:text-orange-500 transition-colors">Gallery</a>
					<div class="flex items-center gap-1.5 px-2 py-1 bg-orange-500/10 border border-orange-500/20">
						<CircleAlert class="h-3 w-3 text-orange-600 dark:text-orange-400" />
						<span class="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Public Environment</span>
					</div>
				</div>
			</header>

			{#if app.currentGeneration}
				<div class="flex">
					<!-- Controls (shown when not showRaw) -->
					<div
						class="border-r border-border pr-3 overflow-hidden transition-all duration-200 {showRawOutput
							? 'w-0 opacity-0'
							: 'w-1/2 opacity-100'}">
						<div class="space-y-3 p-3 min-w-0">
							<!-- Prompt Section -->
							<PromptInput />

							<!-- Reference Images -->
							<InputImagesPreview />

							<Separator />

							<!-- Output Settings -->
							<OutputSettings />

							<Separator class="" />

							<!-- ModelSettings -->
							<ModelSettings />

							<Separator />

							<!-- Prompt Templates (Collapsible) -->
							<Collapsible.Root bind:open={promptTemplatesOpen}>
								<Collapsible.Trigger
									class="flex items-center justify-between w-full py-1.5 px-2 bg-muted hover:bg-muted/80 transition-colors">
									<span class="text-xs font-semibold text-foreground">Prompt Templates</span>
									<ChevronDown class="h-3 w-3 transition-transform {promptTemplatesOpen ? 'rotate-180' : ''}" />
								</Collapsible.Trigger>

								<Collapsible.Content class="pt-3 space-y-3">
									<PromptTermplates />
								</Collapsible.Content>
							</Collapsible.Root>

							<div class="pt-3 border-t border-border">
								<!-- onclick={handleGenerate} -->
								<Button
									class="w-full bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold h-9 text-sm"
									disabled={app.isGenerating}>
									{#if app.isGenerating}
										<WandSparkles class="mr-2 h-4 w-4 animate-spin" />
										Generating...
									{:else}
										<WandSparkles class="mr-2 h-4 w-4" />
										Generate
									{/if}
								</Button>
							</div>

							<!-- Cost Display -->
							<!-- <CostDisplay /> -->
						</div>
					</div>

					<!-- Preview (always 50%) -->
					<div class="w-1/2 shrink-0">
						<div class="h-fit flex flex-col p-3">
							<div class="flex items-center justify-between pb-2 border-b border-border">
								<h2 class="text-sm font-bold text-foreground">Preview</h2>
								<div class="flex items-center gap-4">
									{#if app.currentGeneration?.format === 'ascii'}
										<div class="flex items-center gap-2">
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
									<div class="flex items-center gap-2">
										<Label for="show-raw" class="text-xs font-medium text-foreground">Show Raw</Label>
										<Switch id="show-raw" bind:checked={showRawOutput} />
									</div>
								</div>
							</div>
							<div class="flex-1 flex flex-col h-fit gap-3 pt-3">
								<ArtifactPreview />
								<StepsHistory />
							</div>
						</div>
					</div>

					<!-- Raw Output (shown when showRaw) -->
					<div
						class="border-l border-border pl-3 overflow-hidden transition-all duration-200 {showRawOutput
							? 'w-1/2 opacity-100'
							: 'w-0 opacity-0'}">
						<div class="h-full flex flex-col p-3 min-w-0">
							<div class="flex items-center justify-between pb-2 border-b border-border">
								<h2 class="text-sm font-bold text-foreground">Raw Output</h2>
							</div>
							<div class="flex-1 flex flex-col min-h-[400px] pt-3">
								<RawOutput />
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

{@render children()}
