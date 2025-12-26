<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { providerLabel, providers, type providersKey } from '$lib/models';
	import * as p from '$lib/persisted.svelte';
	import { cn } from '$lib/utils';
	import { Eye, EyeOff, Info, Trash2 } from '@lucide/svelte';

	let showApiKey = $state(false);

	const gen = $derived(app.currentGeneration);
	const selectedProvider = $derived(gen?.provider ?? 'anthropic');
	const selectedModel = $derived(gen?.model ?? '');

	const modelLabel = $derived.by(() => {
		if (selectedModel === 'custom') return 'Custom Model';
		const providerModels = providers[selectedProvider]?.models || [];
		return providerModels.find((m) => m.value === selectedModel)?.label || selectedModel || 'Select a model';
	});

	const endpointPlaceholder = $derived(selectedProvider === 'custom' ? 'e.g. https://api.openai.com/v1' : 'Leave empty for default');

	function handleProviderChange(value: string | undefined) {
		if (value && value in providers) {
			app.switchProvider(value as providersKey);
		}
	}

	function handleModelChange(value: string | undefined) {
		if (gen && value) {
			gen.model = value;
			// Also save to persisted for remembering per-provider selection
			p.selected_model.current[selectedProvider] = value;
		}
	}
</script>

{#if gen}
	<div class="space-y-3">
		<div class="grid grid-cols-2 gap-2">
			<div class="space-y-1.5">
				<Label for="provider-select" class="text-xs font-semibold text-foreground">Provider</Label>
				<Select type="single" value={gen.provider} onValueChange={handleProviderChange}>
					<SelectTrigger class="border-border h-8 text-sm">
						{providerLabel(gen.provider)}
					</SelectTrigger>
					<SelectContent>
						{#each Object.values(providers) as prov}
							<SelectItem value={prov.value}>{prov.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="space-y-1.5">
				{#if selectedProvider === 'custom'}
					<Label for="custom-model-id" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Model ID</Label>
					<Input
						id="custom-model-id"
						bind:value={gen.model}
						placeholder="e.g. my-model"
						class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
				{:else}
					<Label for="model-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Model</Label>
					<Select type="single" value={gen.model} onValueChange={handleModelChange}>
						<SelectTrigger class="border-slate-300 dark:border-slate-700 h-8 text-sm">
							{modelLabel}
						</SelectTrigger>
						<SelectContent>
							{#each providers[selectedProvider].models as modelOption}
								<SelectItem value={modelOption.value}>{modelOption.label}</SelectItem>
							{/each}
							<SelectItem value="custom">Custom...</SelectItem>
						</SelectContent>
					</Select>
				{/if}
			</div>
		</div>

		{#if selectedModel === 'custom' && selectedProvider !== 'custom'}
			<div class="space-y-1.5">
				<Label for="custom-model-id-override" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Model ID</Label>
				<Input
					id="custom-model-id-override"
					bind:value={gen.model}
					placeholder="e.g. my-finetuned-model"
					class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
			</div>
		{/if}

		<div class="space-y-1.5">
			<Label for="endpoint" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
				API Endpoint {#if selectedProvider === 'custom'}<span class="text-destructive">*</span>{/if}
			</Label>
			<Input
				id="endpoint"
				bind:value={gen.endpoint}
				placeholder={endpointPlaceholder}
				class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
		</div>

		<div class="space-y-1.5">
			<div class="flex items-center gap-1.5">
				<Label for="api-key" class="text-xs font-semibold text-foreground">
					API Key for {providerLabel(gen.provider)}
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
								<li>Only sent directly to {providerLabel(gen.provider)}</li>
							</ul>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>
			<div class="flex gap-1">
				<Input
					id="api-key"
					bind:value={p.apiKeys.current[gen.provider]}
					placeholder={`Enter ${providerLabel(gen.provider)} API Key`}
					class={cn('border-border h-8 text-sm', !showApiKey && 'security-disc')}
					autocomplete="off"
					spellcheck="false" />
				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
					onclick={() => (showApiKey = !showApiKey)}
					title={showApiKey ? 'Hide API key' : 'Show API key'}>
					{#if showApiKey}
						<EyeOff class="h-3 w-3" />
					{:else}
						<Eye class="h-3 w-3" />
					{/if}
				</Button>

				<Button
					variant="outline"
					size="icon"
					class="h-8 w-8"
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

	<style>
		:global(.security-disc) {
			-webkit-text-security: disc;
		}
	</style>
{/if}
