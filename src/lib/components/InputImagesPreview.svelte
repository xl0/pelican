<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as ImageZoom from '$lib/components/ui/image-zoom';
	import { getInputImageUrl } from '$lib/utils';
	import { X, ImagePlus } from '@lucide/svelte';

	// Image from DB has id + extension (no longer tied to a generation)
	type DBImage = { id: string; extension: string };

	// Get URL for a DB image
	function getImageUrl(img: DBImage): string {
		return getInputImageUrl(img.id, img.extension);
	}

	// Create object URL for pending file
	function getFileUrl(file: File): string {
		return URL.createObjectURL(file);
	}

	// Remove a DB image from the generation
	function removeDbImage(id: string) {
		if (!app.currentGeneration) return;
		app.currentGeneration.images = app.currentGeneration.images.filter((img) => img.id !== id);
	}

	// Remove a pending file
	function removePendingFile(index: number) {
		app.pendingInputFiles = app.pendingInputFiles.filter((_, i) => i !== index);
	}

	// Handle file selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			app.pendingInputFiles = [...app.pendingInputFiles, ...input.files];
		}
		// Reset input so same file can be selected again
		input.value = '';
	}

	// Combined count of all images
	const totalImages = $derived((app.currentGeneration?.images?.length ?? 0) + app.pendingInputFiles.length);
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<span class="text-xs font-semibold text-slate-700 dark:text-slate-300">
			Reference Images {#if totalImages > 0}({totalImages}){/if}
		</span>
		<input type="file" id="ref-image-input" class="hidden" onchange={handleFileSelect} accept="image/*" multiple />
		<Button variant="ghost" size="sm" class="h-6 px-2 gap-1" onclick={() => document.getElementById('ref-image-input')?.click()}>
			<ImagePlus class="h-3 w-3" />
			<span class="text-xs">Add</span>
		</Button>
	</div>

	{#if totalImages > 0}
		<ImageZoom.Root>
			<div class="flex flex-wrap gap-2">
				{#if app.currentGeneration?.images}
					{#each app.currentGeneration.images as img (img.id)}
						<div class="relative group">
							<ImageZoom.Trigger src={getImageUrl(img)} alt="Reference image" class="w-16 h-16 object-cover rounded border border-border" />
							<Button
								variant="destructive"
								size="icon"
								class="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
								onclick={() => removeDbImage(img.id)}
								title="Remove image">
								<X class="h-3 w-3" />
							</Button>
						</div>
					{/each}
				{/if}

				{#each app.pendingInputFiles as file, i (file.name + i)}
					<div class="relative group">
						<ImageZoom.Trigger
							src={getFileUrl(file)}
							alt={file.name}
							class="w-16 h-16 object-cover rounded border border-border border-dashed" />
						<Button
							variant="destructive"
							size="icon"
							class="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
							onclick={() => removePendingFile(i)}
							title="Remove image">
							<X class="h-3 w-3" />
						</Button>
						<!-- Pending indicator -->
						<div class="absolute bottom-0 left-0 right-0 bg-orange-500/80 text-white text-[8px] text-center">pending</div>
					</div>
				{/each}
			</div>
		</ImageZoom.Root>
	{:else}
		<div class="text-xs text-muted-foreground italic">No reference images. Click "Add" to upload.</div>
	{/if}
</div>
