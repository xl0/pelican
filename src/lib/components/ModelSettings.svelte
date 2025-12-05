<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Input } from "$lib/components/ui/input";
  import { Button } from "$lib/components/ui/button";
  import * as Tooltip from "$lib/components/ui/tooltip";
  import { Eye, EyeOff, Info } from "@lucide/svelte";
  import { appState } from "$lib/state.svelte";
  import { PROVIDERS } from "$lib/models";
</script>

<div class="space-y-3">
  <div class="grid grid-cols-2 gap-2">
    <div class="space-y-1.5">
      <Label for="provider-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Provider</Label>
      <Select type="single" bind:value={appState.provider} onValueChange={() => {
        if (appState.provider !== 'custom') {
           appState.model = PROVIDERS[appState.provider].models[0].value;
        }
        appState.saveSettings();
      }}>
        <SelectTrigger class="border-slate-300 dark:border-slate-700 h-8 text-sm">
          {appState.providerLabel}
        </SelectTrigger>
        <SelectContent>
          {#each Object.values(PROVIDERS) as provider}
            <SelectItem value={provider.value}>{provider.label}</SelectItem>
          {/each}
        </SelectContent>
      </Select>
    </div>

    {#if appState.provider !== 'custom'}
      <div class="space-y-1.5">
        <Label for="model-select" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Model</Label>
        <Select type="single" bind:value={appState.model} onValueChange={() => appState.saveSettings()}>
          <SelectTrigger class="border-slate-300 dark:border-slate-700 h-8 text-sm">
            {appState.model === 'custom' ? 'Custom Model' : PROVIDERS[appState.provider].models.find(m => m.value === appState.model)?.label || appState.model}
          </SelectTrigger>
          <SelectContent>
            {#each PROVIDERS[appState.provider].models as modelOption}
              <SelectItem value={modelOption.value}>{modelOption.label}</SelectItem>
            {/each}
          </SelectContent>
        </Select>
      </div>
    {/if}
  </div>

  {#if appState.model === 'custom' || appState.provider === 'custom'}
     <div class="space-y-1.5">
       <Label for="custom-model-id" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Model ID</Label>
       <Input id="custom-model-id" bind:value={appState.customModelId} oninput={() => appState.saveSettings()} placeholder="e.g. my-finetuned-model" class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
     </div>
  {/if}

  {#if appState.provider === 'custom'}
    <div class="space-y-1.5">
      <Label for="endpoint" class="text-xs font-semibold text-slate-700 dark:text-slate-300">API Endpoint</Label>
      <Input id="endpoint" bind:value={appState.endpoint} oninput={() => appState.saveSettings()} placeholder="https://api.openai.com/v1" class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
    </div>
  {/if}

  <div class="space-y-1.5">
    <div class="flex items-center gap-1.5">
      <Label for="api-key" class="text-xs font-semibold text-slate-700 dark:text-slate-300">API Key for {appState.providerLabel}</Label>
      <Tooltip.Provider>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Info class="h-3 w-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
          </Tooltip.Trigger>
          <Tooltip.Content class="max-w-xs">
            <p class="text-xs">Your API key is:</p>
            <ul class="text-xs list-disc list-inside mt-1 space-y-1">
              <li>Saved locally on your computer</li>
              <li>Never sent to our server</li>
              <li>Only sent directly to {appState.providerLabel}</li>
            </ul>
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>
    </div>
    <div class="flex gap-1">
      <Input type={appState.showApiKey ? "text" : "password"} id="api-key" bind:value={appState.apiKey} oninput={() => appState.saveSettings()} placeholder={`Enter ${appState.providerLabel} API Key`} class="border-slate-300 dark:border-slate-700 h-8 text-sm" />
      <Button variant="outline" size="icon" class="h-8 w-8" onclick={() => appState.showApiKey = !appState.showApiKey} title={appState.showApiKey ? "Hide API key" : "Show API key"}>
        {#if appState.showApiKey}
          <EyeOff class="h-3 w-3" />
        {:else}
          <Eye class="h-3 w-3" />
        {/if}
      </Button>
      <Button variant="outline" size="icon" class="h-8 w-8" onclick={() => appState.clearCurrentApiKey()} title="Clear this key">
        <span class="sr-only">Clear Key</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </Button>
    </div>
    <div class="flex justify-end">
      <Button variant="link" class="text-xs text-slate-500 dark:text-slate-400 h-auto p-0" onclick={() => appState.clearAllApiKeys()}>
        Clear all saved keys
      </Button>
    </div>
  </div>
</div>
