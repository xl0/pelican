<script lang="ts">
	import dbg from 'debug';
	const debug = dbg('app:ModelSettings');
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { getProvidersWithModels } from '$lib/data.remote';
	import * as p from '$lib/persisted.svelte';
	import { ExternalLink, Image, Info, Trash2 } from '@lucide/svelte';

	let isApiKeyFocused = $state(false);

	// Fetch providers with their models from database
	const providersQuery = $derived(getProvidersWithModels());

	// Type for provider with models from query
	type ProviderWithModels = NonNullable<typeof providersQuery.current>[number];

	// Build lookup map from query data
	const providersLookup = $derived.by(() => {
		const data = providersQuery.current;
		if (!data) return new Map<string, ProviderWithModels>();
		return new Map(data.map((prov) => [prov.id, prov]));
	});

	const gen = $derived(app.currentGeneration);
	const selectedProvider = $derived(gen?.provider ?? 'anthropic');
	const selectedModel = $derived(gen?.model ?? '');
	const isCustomModel = $derived(selectedModel === 'custom');

	// Get provider data from database
	const currentProvider = $derived(providersLookup.get(selectedProvider));
	const providerLabel = $derived(currentProvider?.label ?? selectedProvider);
	const apiKeyUrl = $derived(currentProvider?.apiKeyUrl);

	// Get models for current provider
	const currentProviderModels = $derived.by(() => {
		return providersLookup.get(selectedProvider)?.models ?? [];
	});

	// Rating to icon: -1 → 👎, 0 → (none), 1 → 👍, 2 → 👍👍, 3 → 👍👍👍
	function ratingIcon(rating: number | null | undefined): string {
		if (!rating) return '';
		if (rating < 0) return '👎 ';
		return '👍'.repeat(rating) + ' ';
	}

	const currentModel = $derived(currentProviderModels.find((m) => m.value === selectedModel));

	const modelLabel = $derived.by(() => {
		if (isCustomModel) return 'Custom Model';
		return currentModel ? ratingIcon(currentModel.rating) + currentModel.label : selectedModel || 'Select a model';
	});

	// Format cost: skip if 0
	function formatCost(inPrice: number, outPrice: number): string {
		if (inPrice === 0 && outPrice === 0) return '';
		return `$${inPrice.toFixed(2)}/${outPrice.toFixed(2)}`;
	}

	// Cost color: green ≤$2.5, yellow >$10, red >$25 (based on output price)
	function costColor(outPrice: number): string {
		if (outPrice > 25) return 'text-red-500';
		if (outPrice > 10) return 'text-yellow-500';
		if (outPrice <= 2.5) return 'text-green-500';
		return 'text-muted-foreground';
	}

	const endpointPlaceholder = $derived(selectedProvider === 'custom' ? 'e.g. https://api.openai.com/v1' : 'Leave empty for default');

	function handleProviderChange(value: string | undefined) {
		if (!value || !gen) return;
		gen.provider = value;
		// Get first model for new provider from DB, or empty for custom
		const models = providersLookup.get(value)?.models ?? [];
		gen.model = p.selected_model.current[value] ?? models[0]?.value ?? '';
		gen.customModel = p.customModelId.current[value] ?? null;
		gen.endpoint = p.endpoint.current[value] ?? null;
	}

	function handleModelChange(value: string | undefined) {
		if (gen && value) {
			gen.model = value;
			// Also save to persisted for remembering per-provider selection
			p.selected_model.current[selectedProvider] = value;
			// Clear customModel when switching to a non-custom model
			if (value !== 'custom') {
				gen.customModel = null;
			}
		}
	}
</script>

{#if gen}
	<div class="space-y-3">
		<div class="flex flex-wrap gap-2">
			<div class="flex-1 min-w-[140px] space-y-1.5">
				<Label for="provider-select" class="text-xs font-semibold text-foreground">Provider</Label>
				<Select type="single" value={gen.provider} onValueChange={handleProviderChange}>
					<SelectTrigger class="w-full border-border">
						{providerLabel}
					</SelectTrigger>
					<SelectContent>
						{#if providersQuery.current}
							{#each providersQuery.current as prov}
								<SelectItem value={prov.id}>{prov.label}</SelectItem>
							{/each}
						{:else}
							<SelectItem value={selectedProvider}>{providerLabel}</SelectItem>
						{/if}
					</SelectContent>
				</Select>
			</div>

			<div class="flex-1 min-w-[140px] space-y-1.5">
				{#if selectedProvider === 'custom'}
					<Label for="custom-model-id" class="text-xs font-semibold text-foreground">Model ID</Label>
					<Input id="custom-model-id" bind:value={gen.customModel} placeholder="e.g. my-model" class="border-border" />
				{:else}
					<Label for="model-select" class="text-xs font-semibold text-foreground">Model</Label>
					<Select type="single" value={gen.model} onValueChange={handleModelChange}>
						<SelectTrigger class="w-full border-border">
							<span class="truncate">{modelLabel}</span>
						</SelectTrigger>
						<SelectContent class="max-w-md">
							{#each currentProviderModels as modelOption}
								<SelectItem value={modelOption.value}>
									<div class="flex flex-col gap-0.5">
										<div class="flex items-center gap-2">
											{#if modelOption.supportsImages}<span title="Supports image input">
													<Image class="h-3.5 w-3.5 text-muted-foreground" />
												</span>{/if}
											<span>{ratingIcon(modelOption.rating)}{modelOption.label}</span>
											{#if modelOption.inputPrice > 0 || modelOption.outputPrice > 0}
												<span class="text-xs {costColor(modelOption.outputPrice)}">
													{formatCost(modelOption.inputPrice, modelOption.outputPrice)}
												</span>
											{/if}
										</div>
										{#if modelOption.comment}
											<span class="text-xs text-muted-foreground truncate max-w-[300px]">{modelOption.comment}</span>
										{/if}
									</div>
								</SelectItem>
							{/each}
							<SelectItem value="custom">Custom...</SelectItem>
						</SelectContent>
					</Select>
				{/if}
			</div>
		</div>

		<!-- Selected model info -->
		{#if currentModel && (currentModel.comment || currentModel.inputPrice > 0 || currentModel.outputPrice > 0)}
			<div class="text-xs text-muted-foreground space-y-0.5">
				{#if currentModel.inputPrice > 0 || currentModel.outputPrice > 0}
					<span>Token cost:</span>
					<span class={costColor(currentModel.outputPrice)}>
						${currentModel.inputPrice.toFixed(2)} / ${currentModel.outputPrice.toFixed(2)}
					</span>
				{/if}
				{#if currentModel.comment}
					<div class="italic">{currentModel.comment}</div>
				{/if}
			</div>
		{/if}

		{#if !currentModel}
			<div>Google Gemini Flash 3 is a good one to try</div>
		{/if}

		{#if isCustomModel && selectedProvider !== 'custom'}
			<div class="space-y-1.5">
				<Label for="custom-model-id-override" class="text-xs font-semibold text-foreground">Custom Model ID</Label>
				<Input id="custom-model-id-override" bind:value={gen.customModel} placeholder="e.g. my-finetuned-model" class="border-border" />
			</div>
		{/if}

		<div class="space-y-1.5">
			<Label for="endpoint" class="text-xs font-semibold text-foreground">
				API Endpoint {#if selectedProvider === 'custom'}<span class="text-destructive">*</span>{/if}
			</Label>
			<Input id="endpoint" bind:value={gen.endpoint} placeholder={endpointPlaceholder} class="border-border" />
		</div>

		<div class="space-y-1.5">
			<div class="flex items-center gap-1.5">
				<Label for="api-key" class="text-xs font-semibold text-foreground">
					API Key for {providerLabel}
				</Label>
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<Info class="h-3 w-3 text-muted-foreground hover:text-foreground" />
						</Tooltip.Trigger>
						<Tooltip.Content class="max-w-xs">
							<p class="text-xs">Your API key is:</p>
							<ul class="text-xs list-disc list-inside mt-1 space-y-1">
								<li>Saved locally on your computer</li>
								<li>Never sent to our server</li>
								<li>Only sent directly to {providerLabel}</li>
							</ul>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				{#if apiKeyUrl}
					<a
						href={apiKeyUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="ml-auto text-xs text-primary hover:underline flex items-center gap-1">
						Get Key
						<ExternalLink class="h-3 w-3" />
					</a>
				{/if}
			</div>
			<div class="flex gap-1">
				<Input
					id="api-key"
					bind:value={p.apiKeys.current[gen.provider]}
					placeholder={`Enter ${providerLabel} API Key`}
					style={!isApiKeyFocused ? '-webkit-text-security: disc;' : undefined}
					class="border-border"
					autocomplete="off"
					data-1p-ignore
					spellcheck="false"
					onfocus={() => (isApiKeyFocused = true)}
					onblur={() => (isApiKeyFocused = false)} />

				<Button
					variant="outline"
					size="icon"
					onclick={() => {
						p.clearApikey(gen.provider);
					}}
					title="Clear this key">
					<span class="sr-only">Clear Key</span>
					<Trash2 class="h-3.5 w-3.5" />
				</Button>
			</div>
			<div class="flex justify-end">
				<Button
					variant="link"
					class="text-xs text-muted-foreground h-auto p-0"
					onclick={() => {
						p.clearAllApiKeys();
					}}>
					Clear all saved keys
				</Button>
			</div>
		</div>
	</div>
{/if}
