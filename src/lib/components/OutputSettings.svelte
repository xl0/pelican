<script lang="ts">
  import { Label } from "$lib/components/ui/label";
  import { Select, SelectContent, SelectItem, SelectTrigger } from "$lib/components/ui/select";
  import { Input } from "$lib/components/ui/input";
  import { Slider } from "$lib/components/ui/slider";
  import { Switch } from "$lib/components/ui/switch";
  import { appState } from "$lib/state.svelte";

  // Local variable for slider binding (Slider expects [number] type)
  let stepsValue = $state<[number]>([appState.maxSteps]);

  // Sync changes back to appState
  $effect(() => {
    appState.maxStepsArray = stepsValue;
    appState.saveSettings();
  });

  const formatLabel = $derived(appState.outputFormat === 'svg' ? 'SVG Vector' : 'ASCII Art');
</script>

<div class="space-y-3">
  <div class="space-y-2">
    <Label for="format" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Output Format</Label>
    <Select type="single" bind:value={appState.outputFormat} onValueChange={() => appState.saveSettings()}>
      <SelectTrigger class="border-slate-300 dark:border-slate-700 h-8 text-sm">
        {formatLabel}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="svg">SVG Vector</SelectItem>
        <SelectItem value="ascii">ASCII Art</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {#if appState.outputFormat === 'svg'}
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <Label for="width" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Width</Label>
        <Input type="number" id="width" bind:value={appState.width} min={100} max={2000} onchange={() => appState.saveSettings()} class="h-7 text-xs" />
      </div>
      <div class="space-y-1">
        <Label for="height" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Height</Label>
        <Input type="number" id="height" bind:value={appState.height} min={100} max={2000} onchange={() => appState.saveSettings()} class="h-7 text-xs" />
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-2 gap-2">
      <div class="space-y-1">
        <Label for="ascii-width" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Width (chars)</Label>
        <Input type="number" id="ascii-width" bind:value={appState.asciiWidth} min={20} max={200} onchange={() => appState.saveSettings()} class="h-7 text-xs" />
      </div>
      <div class="space-y-1">
        <Label for="ascii-height" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Height (lines)</Label>
        <Input type="number" id="ascii-height" bind:value={appState.asciiHeight} min={10} max={100} onchange={() => appState.saveSettings()} class="h-7 text-xs" />
      </div>
    </div>
  {/if}

  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <Label for="steps" class="text-xs font-semibold text-slate-700 dark:text-slate-300">Refinement Steps: {stepsValue[0]}</Label>
    </div>
    <Slider type="single" id="steps" min={1} max={5} step={1} bind:value={stepsValue as any} />
  </div>

  <div class="flex items-center justify-between">
    <Label for="full-history" class="text-xs font-semibold text-slate-700 dark:text-slate-300">
      {appState.sendFullHistory ? 'Sending all previous steps for context (more tokens)' : 'Sending only last step (faster, fewer tokens)'}
    </Label>
    <Switch id="full-history" bind:checked={appState.sendFullHistory} disabled={stepsValue[0] < 3} onCheckedChange={() => appState.saveSettings()} />
  </div>

  {#if stepsValue[0] < 3}
    <p class="text-xs text-slate-500 dark:text-slate-400">Full history requires 3+ steps</p>
  {/if}
</div>
