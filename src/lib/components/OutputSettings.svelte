<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
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
		if (gen) gen.sendFullHistory = !gen.sendFullHistory;
	}
</script>

{#if gen}
	<div class="space-y-3">
		<!-- Row 1: Format and Size -->
		<div class="flex flex-wrap gap-2 items-end">
			<div class="space-y-1">
				<Label for="format" class="text-xs font-semibold text-foreground">Format</Label>
				<Select type="single" value={gen.format} onValueChange={handleFormatChange}>
					<SelectTrigger class="w-full border-border">
						{formatLabel}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="svg">SVG</SelectItem>
						<SelectItem value="ascii">ASCII</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div class="flex-1">
				{#if gen.format === 'svg'}
					<div class="flex gap-2">
						<div class="space-y-1 flex-1">
							<Label for="width" class="text-xs font-semibold text-foreground">Width</Label>
							<Input type="number" id="width" bind:value={gen.width} min={100} max={2000} class="text-xs" />
						</div>
						<div class="space-y-1 flex-1">
							<Label for="height" class="text-xs font-semibold text-foreground">Height</Label>
							<Input type="number" id="height" bind:value={gen.height} min={100} max={2000} class="text-xs" />
						</div>
					</div>
				{:else}
					<div class="flex gap-2">
						<div class="space-y-1 flex-1">
							<Label for="ascii-width" class="text-xs font-semibold text-foreground">Width (ch)</Label>
							<Input type="number" id="ascii-width" bind:value={gen.width} min={20} max={200} class="text-xs" />
						</div>
						<div class="space-y-1 flex-1">
							<Label for="ascii-height" class="text-xs font-semibold text-foreground">Height (ln)</Label>
							<Input type="number" id="ascii-height" bind:value={gen.height} min={10} max={100} class="text-xs" />
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Row 2: Steps and History -->
		<div class="flex items-end gap-2">
			<div class="w-fit space-y-1 shrink-0">
				<Label for="steps" class="text-xs font-semibold text-foreground">Steps</Label>
				<Input type="number" id="steps" bind:value={gen.maxSteps} min={1} max={999} class="text-xs w-fit" />
			</div>

			<div class="flex-1 flex flex-col justify-center gap-1 min-w-0">
				<div class="flex items-center justify-end gap-2">
					<Label
						for="full-history"
						class="text-xs font-semibold text-foreground truncate"
						title={sendFullHistory ? 'Sending all history' : 'Sending first and last step only'}>
						{sendFullHistory ? 'Send all history' : 'Send first and last step'}
					</Label>
					{#if gen.maxSteps < 3}
						<Switch id="full-history" title="We always send first and last step" checked={false} disabled />
					{:else}
						<Switch id="full-history" checked={sendFullHistory} onCheckedChange={toggleFullHistory} disabled={gen.maxSteps < 3} />
					{/if}
				</div>
			</div>
		</div>
		{#if gen.maxSteps > 10}
			<p class="text-tiny text-primary font-medium leading-tight">That's a lot of steps</p>
		{/if}
		{#if gen.maxSteps > 50}
			<p class="text-tiny text-primary font-medium leading-tight">No, seriously, that's too much!</p>
		{/if}
		{#if gen.maxSteps > 100}
			<p class="text-tiny text-primary font-medium leading-tight">Hey I'll do it, it's your tokens.</p>
		{/if}
	</div>
{/if}
