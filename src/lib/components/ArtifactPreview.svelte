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
	import { renderAsciiToSvg, parseSvg } from '$lib/svg';
	import { xml } from '@codemirror/lang-xml';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { Decoration, EditorView } from '@codemirror/view';
	import { RangeSetBuilder } from '@codemirror/state';
	import CodeMirror from 'svelte-codemirror-editor';

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
	const isGenerating = $derived(app.isGenerating);

	// SVG parse state (debounced during generation to avoid backlog)
	let displaySvg = $state<string | null>(null);
	let svgParseError = $state<string | null>(null);
	let svgErrorLine = $state<number | null>(null);
	let svgErrorCol = $state<number | null>(null);

	// Debounced parsing effect
	$effect(() => {
		if (!isSvg || !body) {
			displaySvg = null;
			svgParseError = null;
			svgErrorLine = null;
			svgErrorCol = null;
			return;
		}

		// Debounce during generation (100ms), immediate when complete
		const delay = isGenerating ? 100 : 0;
		const timeout = setTimeout(() => {
			const result = parseSvg(body);
			displaySvg = result.svg ?? null;
			if (!result.valid) {
				svgParseError = result.error ?? 'Unknown parse error';
				svgErrorLine = result.line ?? null;
				svgErrorCol = result.column ?? null;
			} else {
				svgParseError = null;
				svgErrorLine = null;
				svgErrorCol = null;
			}
		}, delay);

		return () => clearTimeout(timeout);
	});

	// Blob URL for SVG zoom
	let svgBlobUrl = $state<string>('');

	// Create blob URL from display SVG
	$effect(() => {
		if (!displaySvg) {
			svgBlobUrl = '';
			return;
		}
		const blob = new Blob([displaySvg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		svgBlobUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	// Line decoration for highlighting error line (background)
	const errorLineDecoration = Decoration.line({ class: 'cm-error-line' });
	// Mark decoration for highlighting error position within line
	const errorMarkDecoration = Decoration.mark({ class: 'cm-error-mark' });

	// Extension that applies decorations based on svgErrorLine
	const errorDecorationExtension = $derived.by(() => {
		const errorLine = svgErrorLine;
		const errorCol = svgErrorCol;
		return EditorView.decorations.compute(['doc'], (state) => {
			const builder = new RangeSetBuilder<Decoration>();
			if (errorLine && errorLine <= state.doc.lines) {
				const line = state.doc.line(errorLine);
				// Add line decoration (background)
				builder.add(line.from, line.from, errorLineDecoration);
				// Add mark decoration for a range around the error position
				if (errorCol) {
					const CONTEXT_CHARS = 5;
					const markStart = Math.max(line.from, line.from + errorCol - 1 - CONTEXT_CHARS);
					const markEnd = Math.min(line.to, line.from + errorCol - 1 + CONTEXT_CHARS);
					if (markStart < markEnd) {
						builder.add(markStart, markEnd, errorMarkDecoration);
					}
				}
			}
			return builder.finish();
		});
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
		if (!app.isGenerating && body && isSvg && !svgParseError) {
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
			isSvg &&
			!svgParseError
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
							<DropdownMenu.Item onclick={copySvg} disabled={!!svgParseError}>
								<FileCode class="h-4 w-4 mr-2" />
								Copy as SVG{svgParseError ? ' (error)' : ''}
							</DropdownMenu.Item>
							<DropdownMenu.Item onclick={copyPng} disabled={!!svgParseError}>
								<FileImage class="h-4 w-4 mr-2" />
								Copy as PNG{svgParseError ? ' (error)' : ''}
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
					{#if svgParseError}
						<div class="w-full h-full overflow-auto p-4 bg-destructive/10 border border-destructive/30 rounded svg-error-view">
							<div class="text-destructive font-medium mb-2">
								SVG Parse Error{svgErrorLine ? ` (line ${svgErrorLine}${svgErrorCol ? `, col ${svgErrorCol}` : ''})` : ''}
							</div>
							<div class="rounded overflow-hidden border border-border">
								<CodeMirror
									value={body}
									lang={xml()}
									theme={oneDark}
									editable={false}
									lineNumbers={true}
									extensions={[EditorView.lineWrapping, errorDecorationExtension]} />
							</div>
						</div>
					{/if}
					{#if displaySvg}
						<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full">
							{@html displaySvg}
						</div>
					{/if}
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
	.svg-error-view :global(.cm-editor) {
		font-size: 0.75rem;
	}
	.svg-error-view :global(.cm-error-line) {
		background-color: rgba(239, 68, 68, 0.15); /* red-500, soft background */
	}
	.svg-error-view :global(.cm-error-mark) {
		background-color: rgba(239, 68, 68, 0.4); /* red-500, stronger highlight */
		border-bottom: 2px wavy rgba(239, 68, 68, 0.8);
	}
</style>
