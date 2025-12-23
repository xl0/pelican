<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { providerLabel, providers } from '$lib/models';
	import * as p from '$lib/persisted.svelte';
	import { Eye, EyeOff, Info, Trash2 } from '@lucide/svelte';

	// Local UI state
	let showApiKey = $state(false);
	// let apiKeyValue = $state(getApiKey(provider.current));

	// Derived
	// const providerLabel = $derived(providers[provider.current]?.label || "Custom");
</script>

<div class="space-y-3">
	<div class="grid grid-cols-2 gap-2">
		<div class="space-y-1.5">
			<Label for="provider-select" class="text-xs font-semibold text-foreground">Provider</Label>
			<Select type="single" bind:value={p.provider.current}>
				<SelectTrigger class="border-border h-8 text-sm">
					{providerLabel(p.provider.current)}
				</SelectTrigger>
				<SelectContent>
					{#each Object.values(providers) as p}
						<SelectItem value={p.value}>{p.label}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>

		<!--
    {#if provider.current !== 'custom'}
      <div class="space-y-1.5">
        <Label for="model-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Model</Label>
        <Select type="single" bind:value={selected_model.current}>
          <SelectTrigger class="border-slate-300 dark:border-slate-700 h-8 text-sm">
            {selected_model.current === 'custom' ? 'Custom Model' : providers[provider.current].models.find(m => m.value === selected_model.current)?.label || selected_model.current}
          </SelectTrigger>
          <SelectContent>
            {#each providers[provider.current].models as modelOption}
              <SelectItem value={modelOption.value}>{modelOption.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    {/if} -->
	</div>

	<!-- {#if selected_model.current === 'custom' || provider.current === 'custom'}
     <div class="space-y-1.5">
       <Label for="custom-model-id" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Model ID</Label>
       <Input id="custom-model-id" bind:value={customModelId.current} placeholder="e.g. my-finetuned-model" class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
     </div>
  {/if} -->

	<!-- {#if provider.current === 'custom'}
    <div class="space-y-1.5">
      <Label for="endpoint" class="text-xs font-semibold text-slate-700 dark:text-slate-300">API Endpoint</Label>
      <Input id="endpoint" bind:value={endpoint.current} placeholder="https://api.openai.com/v1" class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
    </div>
  {/if} -->

	<div class="space-y-1.5">
		<div class="flex items-center gap-1.5">
			<Label for="api-key" class="text-xs font-semibold text-foreground">
				API Key for {providerLabel(p.provider.current)}
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
							<li>Only sent directly to {providerLabel(p.provider.current)}</li>
						</ul>
					</Tooltip.Content>
				</Tooltip.Root>
			</Tooltip.Provider>
		</div>
		<div class="flex gap-1">
			<Input
				type={showApiKey ? 'text' : 'password'}
				id="api-key"
				bind:value={p.apiKeys.current[p.provider.current]}
				placeholder={`Enter ${providerLabel(p.provider.current)} API Key`}
				class="border-border h-8 text-sm" />
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
					p.clearApikey(p.provider.current);
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
