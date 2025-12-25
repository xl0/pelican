<script lang="ts">
	import { app } from '$lib/appstate.svelte';
	import PromptEditor from '$lib/components/PromptEditor.svelte';
	import * as p from '$lib/persisted.svelte';

	const gen = $derived(app.currentGeneration);

	// Reset handlers
	function resetInitialTemplate() {
		if (!gen) return;

		if (gen.id && app.originalTemplates) {
			// Existing generation: reset to stored DB value
			gen.initialTemplate = app.originalTemplates.initial;
		} else {
			// New generation: reset persisted to default
			if (gen.format === 'ascii') {
				p.asciiInitialTemplate.reset();
				gen.initialTemplate = p.asciiInitialTemplate.current;
			} else {
				p.initialTemplate.reset();
				gen.initialTemplate = p.initialTemplate.current;
			}
		}
	}

	function resetRefinementTemplate() {
		if (!gen) return;

		if (gen.id && app.originalTemplates) {
			// Existing generation: reset to stored DB value
			gen.refinementTemplate = app.originalTemplates.refinement;
		} else {
			// New generation: reset persisted to default
			if (gen.format === 'ascii') {
				p.asciiRefinementTemplate.reset();
				gen.refinementTemplate = p.asciiRefinementTemplate.current;
			} else {
				p.refinementTemplate.reset();
				gen.refinementTemplate = p.refinementTemplate.current;
			}
		}
	}
</script>

{#if gen}
	<div class="space-y-3">
		<PromptEditor
			bind:template={gen.initialTemplate}
			bind:rendered={app.renderedPrompt}
			title="Initial template ({gen.format.toUpperCase()})"
			onReset={resetInitialTemplate}
			context={{
				prompt: gen.prompt,
				width: gen.width,
				height: gen.height
			}} />
		<PromptEditor
			bind:template={gen.refinementTemplate}
			bind:rendered={app.renderedRefinementPrompt}
			title="Refinement template ({gen.format.toUpperCase()})"
			onReset={resetRefinementTemplate}
			context={{
				prompt: gen.prompt,
				width: gen.width,
				height: gen.height
			}} />
	</div>
{/if}
