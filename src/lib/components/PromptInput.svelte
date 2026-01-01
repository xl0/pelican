<script lang="ts">
	import dbg from 'debug';
	const debug = dbg('app:PromptInput');
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as ImageZoom from '$lib/components/ui/image-zoom';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { getProvidersWithModels } from '$lib/data.remote';
	import { getInputImageUrl } from '$lib/utils';
	import { AlertTriangle, ImagePlus, X } from '@lucide/svelte';

	let { onsubmit }: { onsubmit?: () => void } = $props();

	// Fetch providers to check vision capability
	const providersQuery = $derived(getProvidersWithModels());

	const supportsImages = $derived.by(() => {
		const gen = app.currentGeneration;
		if (!gen) return true; // Assume yes if no generation
		const data = providersQuery.current;
		if (!data) return true; // Assume yes while loading
		const provider = data.find((p) => p.id === gen.provider);
		if (!provider) return true; // Custom provider - assume yes
		const model = provider.models.find((m) => m.value === gen.model);
		if (!model) return true; // Custom model - assume yes
		return model.supportsImages;
	});

	// Image handling
	type DBImage = { id: string; extension: string };
	const getImageUrl = (img: DBImage) => getInputImageUrl(img.id, img.extension);
	const getFileUrl = (file: File) => URL.createObjectURL(file);
	const removeDbImage = (id: string) => {
		if (app.currentGeneration) app.currentGeneration.images = app.currentGeneration.images.filter((img) => img.id !== id);
	};
	const removePendingFile = (index: number) => {
		app.pendingInputFiles = app.pendingInputFiles.filter((_, i) => i !== index);
	};
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.length) app.pendingInputFiles = [...app.pendingInputFiles, ...input.files];
		input.value = '';
	}
	const totalImages = $derived((app.currentGeneration?.images?.length ?? 0) + app.pendingInputFiles.length);
	const hasImagesButNoVision = $derived(totalImages > 0 && !supportsImages);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			if (!app.isGenerating && onsubmit) onsubmit();
		}
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<Label for="prompt" class="text-sm font-bold text-foreground">Prompt</Label>
		<input
			type="file"
			id="ref-image-input"
			class="hidden"
			onchange={handleFileSelect}
			accept="image/*"
			multiple
			disabled={!supportsImages} />
		<Button
			variant="ghost"
			size="sm"
			class="h-6 px-2 gap-1"
			disabled={!supportsImages}
			title={supportsImages ? 'Add reference image' : 'Selected model does not support images'}
			onclick={() => document.getElementById('ref-image-input')?.click()}>
			<ImagePlus class="h-3 w-3" />
			<span class="text-xs">Add Image</span>
		</Button>
	</div>
	{#if app.currentGeneration}
		<Textarea
			id="prompt"
			placeholder="Describe what you want to see..."
			class="min-h-[60px] resize-none border-border focus:border-primary focus:ring-primary text-sm"
			bind:value={app.currentGeneration.prompt}
			onkeydown={handleKeydown} />

		<!-- Warning if images attached but model doesn't support them -->
		{#if hasImagesButNoVision}
			<div class="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-2 py-1.5 rounded border border-destructive/20">
				<AlertTriangle class="h-3.5 w-3.5 shrink-0" />
				<span>Selected model does not support images. Images will be ignored.</span>
			</div>
		{/if}

		<!-- Images -->
		{#if totalImages > 0}
			<ImageZoom.Root>
				<div class="flex flex-wrap gap-2 pt-1">
					{#each app.currentGeneration.images as img (img.id)}
						<div class="relative group">
							<ImageZoom.Trigger
								src={getImageUrl(img)}
								alt="Reference"
								class="w-12 h-12 object-cover rounded border border-border {hasImagesButNoVision ? 'opacity-50' : ''}" />
							<Button
								variant="destructive"
								size="icon"
								class="absolute -top-1 -right-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
								onclick={() => removeDbImage(img.id)}>
								<X class="h-2 w-2" />
							</Button>
						</div>
					{/each}
					{#each app.pendingInputFiles as file, i (file.name + i)}
						<div class="relative group">
							<ImageZoom.Trigger
								src={getFileUrl(file)}
								alt={file.name}
								class="w-12 h-12 object-cover rounded border border-dashed border-border {hasImagesButNoVision ? 'opacity-50' : ''}" />
							<Button
								variant="destructive"
								size="icon"
								class="absolute -top-1 -right-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
								onclick={() => removePendingFile(i)}>
								<X class="h-2 w-2" />
							</Button>
							<div class="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground text-micro text-center">pending</div>
						</div>
					{/each}
				</div>
			</ImageZoom.Root>
		{/if}
	{/if}
</div>
