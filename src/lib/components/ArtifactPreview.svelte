<script lang="ts">
	import { app } from '$lib/appstate.svelte'; // Ensure imports are correct based on user's manual edits
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as ImageZoom from '$lib/components/ui/image-zoom';
	import * as p from '$lib/persisted.svelte';
	import { ImageDown, ImageIcon } from '@lucide/svelte';
	import { AsciiArt } from 'svelte-asciiart';
	import { toast } from 'svelte-sonner';

	// Get the current artifact to display
	const currentArtifact = $derived.by(() => {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return undefined;
		const step = steps[app.selectedStepIndex ?? steps.length - 1];
		// If step has no artifacts, we return undefined (empty box state)
		const artifacts = step.artifacts;
		if (!artifacts.length) return undefined;
		return artifacts[app.selectedArtifactIndex ?? artifacts.length - 1];
	});

	const gen = $derived(app.currentGeneration);
	const body = $derived(currentArtifact?.body ?? '');

	let svgBlobUrl = $state<string>('');
	let asciiSvgElement = $state<SVGSVGElement | null>(null);

	$effect(() => {
		if (app.isGenerating) return;

		let content = '';
		if (gen?.format === 'svg' && body) {
			content = body;
		} else if (gen?.format === 'ascii' && asciiSvgElement) {
			content = asciiSvgElement.outerHTML;
		}

		if (content) {
			const blob = new Blob([content], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);
			svgBlobUrl = url;
			return () => URL.revokeObjectURL(url);
		} else {
			svgBlobUrl = '';
		}
	});

	async function copyImage() {
		if (!gen || !svgBlobUrl) return;
		const img = new Image();
		img.src = svgBlobUrl;
		img.onload = () => {
			const canvas = document.createElement('canvas');
			canvas.width = gen.width;
			canvas.height = gen.height;
			const ctx = canvas.getContext('2d');
			if (ctx) {
				ctx.fillStyle = gen.format === 'ascii' ? p.asciiBgColor.current : 'white';
				ctx.fillRect(0, 0, canvas.width, canvas.height);
				ctx.drawImage(img, 0, 0);
				canvas.toBlob((blob) => {
					if (blob) {
						navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
						toast.success('Image copied to clipboard');
					}
				}, 'image/png');
			}
		};
	}

	function triggerZoom() {
		if (!app.isGenerating && body) {
			document.getElementById('zoom-trigger')?.click();
		}
	}
</script>

{#if gen}
	{#key svgBlobUrl}
		<ImageZoom.Root>
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="group flex items-center justify-center border border-border relative overflow-hidden [&>svg]:w-full [&>svg]:h-auto bg-muted/10 h-full w-full transition-colors {body &&
				!app.isGenerating
					? 'cursor-zoom-in hover:bg-muted/20'
					: ''}"
				onclick={triggerZoom}>
				<!-- Actions -->
				{#if body && !app.isGenerating}
					<div
						class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
						onclick={(e) => e.stopPropagation()}>
						<Button variant="secondary" size="icon" class="h-8 w-8" onclick={copyImage} title="Copy Image">
							<ImageDown class="h-4 w-4" />
						</Button>
						<CopyButton text={body} />
					</div>
				{/if}

				{#if body}
					{#if gen.format === 'ascii'}
						<div class="w-full h-full" style="background-color: {p.asciiBgColor.current}; color: {p.asciiFgColor.current}">
							<AsciiArt
								text={body}
								rows={gen.height}
								cols={gen.width}
								grid={true}
								frame={true}
								margin={1}
								class="w-full h-full"
								gridClass="ascii-grid"
								frameClass="ascii-frame"
								bind:svg={asciiSvgElement} />
						</div>
					{/if}
					{#if gen.format === 'svg'}
						{@html body}
					{/if}
					<!-- Hidden trigger for zoom (applies to both formats since we generate blob for both) -->
					{#if svgBlobUrl && !app.isGenerating}
						<ImageZoom.Trigger id="zoom-trigger" src={svgBlobUrl} alt="Preview" class="hidden" />
					{/if}
				{:else}
					<!-- Empty State / Generating -->
					<div
						class="w-full h-full flex flex-col justify-center items-center text-muted-foreground {app.isGenerating
							? 'animate-spin-slow'
							: ''}"
						style="aspect-ratio: {gen.width} / {gen.height};">
						<ImageIcon class="h-48 w-48 opacity-20 stroke-1 mb-2" />
						<span>{app.isGenerating ? 'Generating...' : 'No content'}</span>
					</div>
				{/if}
			</div>
		</ImageZoom.Root>
	{/key}
{/if}

<style>
	@keyframes spin-slow {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.animate-spin-slow {
		animation: spin-slow 4s linear infinite;
	}
</style>
