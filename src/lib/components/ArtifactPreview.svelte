<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as ImageZoom from '$lib/components/ui/image-zoom';
	import * as p from '$lib/persisted.svelte';
	import { Clipboard, FileCode, FileImage, FileText, ImageIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import AsciiRenderer from './AsciiRenderer.svelte';
	import { svgStringToPng } from 'svelte-asciiart';
	import { renderAsciiToSvg } from '$lib/svg';

	import dbg from 'debug';
	const debug = dbg('app:ArtifactPreview');

	// Get the current artifact to display
	const currentArtifact = $derived.by(() => {
		const steps = app.currentGeneration?.steps;
		if (!steps?.length) return undefined;
		const step = steps[app.selectedStepIndex ?? steps.length - 1];
		const artifacts = step.artifacts;
		if (!artifacts.length) return undefined;
		return artifacts[app.selectedArtifactIndex ?? artifacts.length - 1];
	});

	const gen = $derived(app.currentGeneration);
	const body = $derived(currentArtifact?.body ?? '');
	const isSvg = $derived(gen?.format === 'svg');

	// Blob URL for SVG zoom only (no ASCII zoom to avoid circular dependency)
	let svgBlobUrl = $state<string>('');

	$effect(() => {
		if (app.isGenerating || !isSvg || !body) {
			svgBlobUrl = '';
			return;
		}
		const blob = new Blob([body], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		svgBlobUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	async function copySvg() {
		if (!gen || !body) return;
		try {
			const svgContent = isSvg ? body : renderAsciiToSvg(body, gen.width, gen.height);
			const blob = new Blob([svgContent], { type: 'image/svg+xml' });
			await navigator.clipboard.write([new ClipboardItem({ 'image/svg+xml': blob })]);
			toast.success('SVG copied to clipboard');
		} catch (e) {
			toast.error('Failed to copy SVG');
		}
	}

	async function copyPng() {
		if (!gen || !body) return;
		try {
			const svgContent = isSvg ? body : renderAsciiToSvg(body, gen.width, gen.height);
			const pngBlob = await svgStringToPng(svgContent, { output: 'blob' });
			await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
			toast.success('PNG copied to clipboard');
		} catch (e) {
			toast.error('Failed to copy PNG');
		}
	}

	async function copyText() {
		if (!body) return;
		try {
			await navigator.clipboard.writeText(body);
			toast.success('Text copied to clipboard');
		} catch (e) {
			toast.error('Failed to copy text');
		}
	}

	function triggerZoom() {
		if (!app.isGenerating && body && isSvg) {
			document.getElementById('zoom-trigger')?.click();
		}
	}
</script>

{#if gen}
	<ImageZoom.Root>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="group grow flex h-fit max-h-full w-fit max-w-full overflow-hidden items-center justify-start border border-border relative transition-colors {body &&
			!app.isGenerating &&
			isSvg
				? 'cursor-zoom-in hover:bg-muted/20'
				: ''}"
			onclick={triggerZoom}>
			<!-- Actions -->
			{#if body && !app.isGenerating}
				<div
					class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
					onclick={(e) => e.stopPropagation()}>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button variant="secondary" size="icon" class="h-8 w-8" {...props} title="Copy">
									<Clipboard class="h-4 w-4" />
								</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item onclick={copySvg}>
								<FileCode class="h-4 w-4 mr-2" />
								Copy as SVG
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={copyPng}>
								<FileImage class="h-4 w-4 mr-2" />
								Copy as PNG
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={copyText}>
								<FileText class="h-4 w-4 mr-2" />
								Copy as Text
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}

			{#if body}
				{#if gen.format === 'ascii'}
					{#key p.asciiStyle.current}
						<AsciiRenderer text={body} rows={gen.height} cols={gen.width} />
					{/key}
				{:else if gen.format === 'svg'}
					<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full">
						{@html body}
					</div>
				{/if}
				<!-- Hidden trigger for SVG zoom only -->
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
