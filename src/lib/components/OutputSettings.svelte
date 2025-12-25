<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { Slider } from '$lib/components/ui/slider';
	import { Switch } from '$lib/components/ui/switch';

	const gen = $derived(app.currentGeneration);
	const formatLabel = $derived(gen?.format === 'svg' ? 'SVG' : 'ASCII Art');
	const sendFullHistory = $derived(gen?.sendFullHistory);

	function handleFormatChange(value: string | undefined) {
		if (value === 'svg' || value === 'ascii') {
			app.setFormat(value);
		}
	}

	function toggleFullHistory() {
		if (gen) gen.sendFullHistory = !gen.sendFullHistory
	}
</script>

{#if gen}
	<div class="space-y-3">
		<div class="space-y-2">
			<Label for="format" class="text-xs font-semibold text-foreground">Output Format</Label>
			<Select type="single" value={gen.format} onValueChange={handleFormatChange}>
				<SelectTrigger class="border-border h-8 text-sm">
					{formatLabel}
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="svg">SVG Vector</SelectItem>
					<SelectItem value="ascii">ASCII Art</SelectItem>
				</SelectContent>
			</Select>
		</div>

		{#if gen.format === 'svg'}
			<div class="grid grid-cols-2 gap-2">
				<div class="space-y-1">
					<Label for="width" class="text-xs font-semibold text-foreground">Width</Label>
					<Input type="number" id="width" bind:value={gen.width} min={100} max={2000} class="h-7 text-xs" />
				</div>
				<div class="space-y-1">
					<Label for="height" class="text-xs font-semibold text-foreground">Height</Label>
					<Input type="number" id="height" bind:value={gen.height} min={100} max={2000} class="h-7 text-xs" />
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-2">
				<div class="space-y-1">
					<Label for="ascii-width" class="text-xs font-semibold text-foreground">Width (chars)</Label>
					<Input type="number" id="ascii-width" bind:value={gen.width} min={20} max={200} class="h-7 text-xs" />
				</div>
				<div class="space-y-1">
					<Label for="ascii-height" class="text-xs font-semibold text-foreground">Height (lines)</Label>
					<Input type="number" id="ascii-height" bind:value={gen.height} min={10} max={100} class="h-7 text-xs" />
				</div>
			</div>
		{/if}

		<div class="space-y-2">
			<div class="flex items-center justify-between">
				<Label for="steps" class="text-xs font-semibold text-foreground">Refinement Steps: {gen.maxSteps}</Label>
			</div>
			<Slider type="single" id="steps" min={1} max={5} step={1} bind:value={gen.maxSteps} />
		</div>

		<div class="flex items-center justify-between">
			<Label for="full-history" class="text-xs font-semibold text-foreground">
				{sendFullHistory ? 'Sending all previous steps for context (more tokens)' : 'Sending only last step (faster, fewer tokens)'}
			</Label>
			{#if gen.maxSteps < 3}
				<Switch id="full-history" checked={false} disabled />
			{:else}
				<Switch id="full-history" checked={sendFullHistory} onCheckedChange={toggleFullHistory} disabled={gen.maxSteps < 3} />
			{/if}
		</div>
	</div>
{/if}
