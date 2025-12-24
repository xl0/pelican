<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import '../app.css';

	import { page } from '$app/state';
	import { app } from '$lib/appstate.svelte';
	import InputImagesPreview from '$lib/components/InputImagesPreview.svelte';
	import ModelSettings from '$lib/components/ModelSettings.svelte';
	import OutputSettings from '$lib/components/OutputSettings.svelte';
	import PromptTermplates from '$lib/components/PromptTermplates.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Switch } from '$lib/components/ui/switch';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getGeneration } from '$lib/data.remote';
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
				app.currentGeneration = g ?? undefined;
			});
		} else {
			// New generation mode - reset to persisted values
			debug('new generation mode');
			app.resetFromPersisted();
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
				<div class="grid grid-cols-1 gap-0 lg:grid-cols-12">
					<!-- Controls -->
					<div class="lg:col-span-5 lg:border-r border-border lg:pr-3">
						<div class="space-y-3 p-3">
							<!-- Prompt Section -->
							<div class="space-y-1.5">
								<Label for="prompt" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Prompt</Label>
								<Textarea
									id="prompt"
									placeholder="Describe what you want to see..."
									class="min-h-[60px] resize-none border-slate-300 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500 text-sm"
									bind:value={app.currentGeneration.prompt} />
							</div>

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
									<span class="text-xs font-semibold text-foreground">Prompt Templates (Advanced)</span>
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
										Generate Art
									{/if}
								</Button>
							</div>

							<!-- Cost Display -->
							<!-- <CostDisplay /> -->
						</div>
					</div>

					<!-- Preview -->
					<div class="lg:col-span-7">
						<div class="h-full flex flex-col p-3">
							<div class="flex items-center justify-between pb-2 border-b border-border">
								<h2 class="text-sm font-bold text-foreground">Preview</h2>
								<div class="flex items-center gap-2">
									<Label for="show-raw" class="text-xs font-medium text-foreground">Show Raw</Label>
									<Switch id="show-raw" bind:checked={showRawOutput} />
								</div>
							</div>
							<div class="flex-1 flex flex-col min-h-[400px] gap-3 pt-3">
								<div
									class="flex-1 flex items-center justify-center bg-muted border border-border relative overflow-hidden select-text [&>svg]:w-full [&>svg]:h-full">
									<!-- {#if generatedImage}
                {#if !generatedImage.startsWith('data:') && !generatedImage.startsWith('/') && !generatedImage.startsWith('http')}
                    <div class="w-full h-full bg-slate-950 text-emerald-400">
                      <AsciiArt
                        text={generatedImage}
                        rows={asciiHeight.current}
                        cols={asciiWidth.current}
                        grid={true}
                        frame={true}
                        margin={1}
                        class="w-full h-full"
                        gridClass="stroke-slate-700/40"
                        frameClass="stroke-orange-500/40"
                      />
                    </div>
                {:else if generatedImage.startsWith('data:image/svg+xml')}
                    {@html decodeURIComponent(generatedImage.split(',')[1])}
                {:else}
                    <img src={generatedImage} alt="Generated Art" class="max-w-full max-h-full object-contain" />
                {/if}
              {:else}
                <div class="text-center space-y-2 text-slate-400 dark:text-slate-500">
                  <ImageIcon class="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p class="text-sm font-medium">No image generated yet</p>
              </div>
            {/if} -->
								</div>

								<!-- {#if projectState.generations.length > 0}
            <div class="h-20 flex gap-1.5 overflow-x-auto pb-2 border-t border-slate-300 dark:border-slate-700 pt-2">
               {#each projectState.generations as gen, i}
                 {@const isSelected = uiState.selectedStepIndex === i || (uiState.selectedStepIndex === null && i === projectState.generations.length - 1)}
                 <button
                   class="relative aspect-square h-full border overflow-hidden transition-all hover:ring-1 hover:ring-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 {isSelected ? 'ring-2 ring-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-700'}"
                   onclick={() => {
                      uiState.selectedStepIndex = i;
                      currentRawOutput = gen.rawOutput || "";
                   }}
                 >
                   {#if !gen.rawOutput}
                      <div class="w-full h-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                  {:else if outputFormat.current === 'ascii'}
                       <div class="w-full h-full bg-slate-950 text-emerald-400 p-0.5 pointer-events-none">
                         <AsciiArt
                           text={gen.rawOutput.replace(/^```(?:ascii)?\n/, '').replace(/```$/, '')}
                           rows={asciiHeight.current}
                           cols={asciiWidth.current}
                           frame={true}
                           margin={1}
                           class="w-full h-full"
                           frameClass="stroke-orange-500/40"
                         />
                       </div>
                  {:else}
                      {@const match = gen.rawOutput.match(/```(?:xml|svg)?\n(<svg[\s\S]*?<\/svg>)/)}
                      {#if match}
                        <div class="w-full h-full [&>svg]:w-full [&>svg]:h-full flex items-center justify-center bg-white p-0.5 pointer-events-none">
                            {@html match[1]}
                        </div>
                      {/if}
                  {/if}
                   <span class="absolute bottom-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] px-1 py-0.5 font-bold">v{i + 1}</span>
                 </button>
               {/each}
            </div>
          {/if} -->

								<!-- {#if generatedImage}
            <div class="flex justify-between items-center gap-2 border-t border-slate-300 dark:border-slate-700 pt-2 mt-2">
             <div class="text-xs font-medium text-slate-600 dark:text-slate-400">
               {#if uiState.isGenerating}
                  Refining... (Step {projectState.generations.length + 1})
               {:else}
                  Generation complete
               {/if}
             </div>
             <div class="flex gap-1">
              <Button variant="outline" size="sm" class="border-slate-300 dark:border-slate-700 h-7 text-xs">
                  <Copy class="mr-1 h-3 w-3" />
                  Copy
              </Button>
              <Button size="sm" class="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-7 text-xs">
                  <Download class="mr-1 h-3 w-3" />
                  Download
              </Button>
             </div>
            </div>
          {/if}
        </div> -->

								<!-- {#if showRawOutput && currentRawOutput}
          <div class="mt-3 p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div class="pb-2 border-b border-slate-300 dark:border-slate-700 mb-2">
              <h3 class="text-xs font-bold text-slate-900 dark:text-slate-100">Raw Data</h3>
            </div>

            {#if currentGeneration}
                {#if currentGeneration.renderedPrompt}
                     <details class="mb-2 group">
                        <summary class="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-orange-500 flex items-center gap-1">
                            <span>Model Input (Prompt)</span>
                            <span class="text-[10px] text-slate-400 group-open:hidden">(click to expand)</span>
                        </summary>
                        <div class="mt-2 p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-48 border border-slate-200 dark:border-slate-700 rounded-sm">
                            {currentGeneration.renderedPrompt}
                        </div>
                     </details>
                {/if}
            {/if}

            <div>
              <div class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Model Output</div>
              <div class="p-3 bg-slate-950 text-emerald-400 font-mono text-xs whitespace-pre-wrap overflow-auto max-h-96 border border-slate-800 rounded-sm">
                {currentRawOutput}
              </div>
            </div>
          </div>
        {/if} -->
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

{@render children()}
